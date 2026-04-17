import logger from "../../infra/logging/logger";

const ALIVE_API_BASE_URL = (process.env.ALIVE_API_BASE_URL || "https://dev.aliveinnovations.com/api").replace(/\/$/, "");
const ALIVE_API_INGREDIENTS_URL = process.env.ALIVE_API_INGREDIENTS_URL || `${ALIVE_API_BASE_URL}/ingredients`;
const ALIVE_API_GET_QUOTE_URL = process.env.ALIVE_API_GET_QUOTE_URL || `${ALIVE_API_BASE_URL}/get-quote`;
const ALIVE_API_MIX_PRODUCT_URL = process.env.ALIVE_API_MIX_PRODUCT_URL || `${ALIVE_API_BASE_URL}/mix-product`;
const ALIVE_API_EXTERNAL_ORDER_URL = process.env.ALIVE_API_EXTERNAL_ORDER_URL || `${ALIVE_API_BASE_URL}/external-order`;
const ALIVE_API_KEY = process.env.ALIVE_API_KEY || "";
const ALIVE_API_ORIGIN = process.env.ALIVE_API_ORIGIN || "https://myones.onrender.com";

// ── Production safety: warn if Alive API is pointing at dev URL in production ──
if (process.env.NODE_ENV === 'production' && ALIVE_API_BASE_URL.includes('dev.aliveinnovations.com')) {
    logger.error('ALIVE_API_BASE_URL is pointing at the DEV environment in production - set ALIVE_API_BASE_URL to the production URL');
}
if (process.env.NODE_ENV === 'production' && !process.env.ALIVE_API_KEY) {
    logger.error('ALIVE_API_KEY is not set in production - manufacturer ordering will fail');
}
const ALIVE_API_HEADER_NAME = process.env.ALIVE_API_HEADER_NAME || "X-API-KEY";
const ALIVE_API_TIMEOUT_MS = Number(process.env.ALIVE_API_TIMEOUT_MS || 10000);
const QUOTE_WEEKS = 8;
const QUOTE_DAYS = 56;
const VALID_CAPSULE_COUNTS = [6, 9, 12] as const;
const MARGIN_MULTIPLIER = 1.65; // 65% margin applied to manufacturer cost (shipping baked in, shown as free)

type CapsuleCount = (typeof VALID_CAPSULE_COUNTS)[number];

type FormulaIngredient = {
    ingredient?: string;
    amount?: number;
};

type ManufacturerIngredient = {
    ingredient_id: string | number;
    name: string;
};

type QuoteRequestIngredient = {
    ingredient_id: string | number;
    weight_in_mg: number;
};

type QuoteResult = {
    available: boolean;
    reason?: string;
    capsuleCount: CapsuleCount;
    totalCapsules: number;
    weeks: number;
    manufacturerCost?: number;  // raw Alive cost before margin (for internal use)
    manufacturerDiscount?: number; // Alive practitioner-level discount amount
    manufacturerShipping?: number; // Alive shipping cost
    manufacturerRetailPrice?: number; // Alive retail_price (with practitioner markup)
    subtotal?: number;
    shipping?: number;
    total?: number;
    currency: "USD";
    mappedIngredients: number;
    unmappedIngredients: string[];
    quoteId?: string;           // Alive quote_id for placing production order
    quoteExpiresAt?: string;    // ISO timestamp when quote expires on Alive's side
};

type ManufacturerOrderResult = {
    success: boolean;
    orderId?: string;
    error?: string;
};

export type ManufacturerOrderCustomerInfo = {
    customerName: string;
    email: string;
    phone?: string;
    billingAddress: {
        line1: string;
        line2?: string;
        city: string;
        state?: string;
        zip: string;
        country?: string;
    };
    shippingAddress: {
        line1: string;
        line2?: string;
        city: string;
        state?: string;
        zip: string;
        country?: string;
    };
};

const NAME_ALIASES: Record<string, string> = {
    "ashwagandha": "ashwaganda",
    "coenzyme q10": "coenzyme q10",
    "blackcurrant extract": "black currant extract",
    "phosphatidylcholine": "phosphatidycholine",
    "curcumin": "turmeric root extract 4:1",
    "turmeric": "turmeric root extract 4:1",
    "ginkgo biloba": "ginko biloba extract 24%",
    "ginkgo biloba extract 24%": "ginko biloba extract 24%",
    "ginkgo": "ginko biloba extract 24%",
    "vitamin e": "vitamin e (mixed tocopherols)",
    "omega-3": "omega 3",
    "milk thistle": "milk thistle (seed)",
    "calcium": "calcium (as dicalcium phosphate)",
    "hawthorn": "hawthorn berry",
    "nettle": "stinging nettle",
    "mens health support": "mens health mix",
    "cardiovascular support": "cardiovascular support mix",
    "digestive support": "digestive enzyme mix",
    "anti-inflammatory support": "anti-inflammatory mix",
    "antioxidant support": "antioxidant support mix",
    "blood sugar support": "blood sugar support mix",
    "eye health support": "eye health mix",
    "hair, skin & nails support": "hair, skin & nail mix",
    "joint support": "joint support mix",
    "sleep support": "sleep support mix",
};

function normalizeName(name: string): string {
    return String(name || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
}

function normalizeCatalogName(name: string): string {
    return normalizeName(name)
        .replace(/&/g, " and ")
        .replace(/[-_/]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function toCanonicalVariants(name: string): string[] {
    const normalized = normalizeCatalogName(name);
    const variants = new Set<string>([normalized]);

    variants.add(normalized.replace(/\bmix\b/g, "").replace(/\s+/g, " ").trim());
    variants.add(normalized.replace(/\bsupport\b/g, "support mix").replace(/\s+/g, " ").trim());
    variants.add(normalized.replace(/\bsupport mix\b/g, "support").replace(/\s+/g, " ").trim());
    variants.add(normalized.replace(/\bimmune c\b/g, "immune-c"));
    variants.add(normalized.replace(/\bimmune-c\b/g, "immune c"));
    variants.add(normalized.replace(/\bashwagandha\b/g, "ashwaganda"));
    variants.add(normalized.replace(/\bblackcurrant\b/g, "black currant"));
    // Strip extract, percentage, and ratio notations for fuzzy matching
    variants.add(normalized.replace(/\bextract\b/g, "").replace(/\d+%/g, "").replace(/\d+:\d+/g, "").replace(/\s+/g, " ").trim());
    // Also try "ginko" spelling variant (manufacturer uses single-g)
    if (normalized.includes("ginkgo")) {
        variants.add(normalized.replace(/\bginkgo\b/g, "ginko"));
    }

    return Array.from(variants).filter(Boolean);
}

function isValidCapsuleCount(value: number): value is CapsuleCount {
    return VALID_CAPSULE_COUNTS.includes(value as CapsuleCount);
}

class ManufacturerPricingService {
    private cachedIngredients: ManufacturerIngredient[] | null = null;
    private cachedAt = 0;
    private readonly cacheMs = 15 * 60 * 1000;

    private buildAuthHeaders(): Record<string, string> {
        const headers: Record<string, string> = {
            [ALIVE_API_HEADER_NAME]: ALIVE_API_KEY,
            'Origin': ALIVE_API_ORIGIN,
        };
        if (ALIVE_API_ORIGIN) {
            headers.Origin = ALIVE_API_ORIGIN;
            headers.Referer = `${ALIVE_API_ORIGIN.replace(/\/$/, "")}/`;
        }
        return headers;
    }

    private async fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), ALIVE_API_TIMEOUT_MS);
        try {
            return await fetch(url, { ...init, signal: controller.signal });
        } finally {
            clearTimeout(timeoutId);
        }
    }

    private async fetchIngredientsCatalog(): Promise<ManufacturerIngredient[]> {
        const now = Date.now();
        if (this.cachedIngredients && now - this.cachedAt < this.cacheMs) {
            return this.cachedIngredients;
        }

        const response = await this.fetchWithTimeout(ALIVE_API_INGREDIENTS_URL, {
            method: "GET",
            headers: {
                ...this.buildAuthHeaders(),
                "Accept": "application/json",
            },
        });

        if (!response.ok) {
            throw new Error(`Manufacturer ingredients API failed: ${response.status}`);
        }

        const json: any = await response.json();
        const data = Array.isArray(json?.data) ? json.data : (Array.isArray(json) ? json : []);

        this.cachedIngredients = data
            .filter((item: any) => {
                const hasId = typeof item?.ingredient_id === "number" || (typeof item?.ingredient_id === "string" && item.ingredient_id.trim().length > 0);
                return item && hasId && typeof item.name === "string";
            })
            .map((item: any) => ({ ingredient_id: item.ingredient_id, name: item.name }));
        this.cachedAt = now;
        return this.cachedIngredients || [];
    }

    /**
     * Public access to Alive ingredient catalog for the sync service.
     * Always fetches fresh (bypasses the 15-min cache).
     */
    async fetchIngredientsCatalogPublic(): Promise<ManufacturerIngredient[]> {
        this.cachedIngredients = null;
        this.cachedAt = 0;
        return this.fetchIngredientsCatalog();
    }

    private resolveManufacturerIngredientId(name: string, catalog: ManufacturerIngredient[]): string | number | null {
        const normalized = normalizeCatalogName(name);
        const alias = normalizeCatalogName(NAME_ALIASES[normalizeName(name)] || normalized);
        const targetVariants = new Set<string>([
            ...toCanonicalVariants(normalized),
            ...toCanonicalVariants(alias),
        ]);

        for (const item of catalog) {
            const itemVariants = toCanonicalVariants(item.name);
            if (itemVariants.some((variant) => targetVariants.has(variant))) {
                return item.ingredient_id;
            }
        }

        // Phase 2: substring match (with minimum length guard to prevent tiny catalog
        // entries like "IN" from matching everything containing those letters)
        const MIN_SUBSTRING_LENGTH = 4;
        for (const item of catalog) {
            const itemNormalized = normalizeCatalogName(item.name);
            if (itemNormalized.length < MIN_SUBSTRING_LENGTH) continue; // skip junk/test entries
            for (const variant of targetVariants) {
                if (!variant || variant.length < MIN_SUBSTRING_LENGTH) continue;
                if (itemNormalized.includes(variant) || variant.includes(itemNormalized)) {
                    return item.ingredient_id;
                }
            }
        }

        return null;
    }

    async auditCatalogMappings(ingredientNames: string[]) {
        const uniqueIngredientNames = Array.from(new Set(
            ingredientNames
                .map((name) => String(name || "").trim())
                .filter(Boolean)
        ));

        if (!ALIVE_API_KEY) {
            return {
                available: false,
                reason: "Manufacturer pricing is not configured.",
                total: uniqueIngredientNames.length,
                mapped: [] as Array<{ name: string; ingredientId: string | number }>,
                unmapped: uniqueIngredientNames,
            };
        }

        const catalog = await this.fetchIngredientsCatalog();
        const mapped: Array<{ name: string; ingredientId: string | number }> = [];
        const unmapped: string[] = [];

        for (const ingredientName of uniqueIngredientNames) {
            const ingredientId = this.resolveManufacturerIngredientId(ingredientName, catalog);
            if (!ingredientId) {
                unmapped.push(ingredientName);
                continue;
            }
            mapped.push({ name: ingredientName, ingredientId });
        }

        return {
            available: true,
            total: uniqueIngredientNames.length,
            mapped,
            unmapped,
            mappedCount: mapped.length,
            unmappedCount: unmapped.length,
            coveragePercent: uniqueIngredientNames.length
                ? Number(((mapped.length / uniqueIngredientNames.length) * 100).toFixed(2))
                : 100,
        };
    }

    async quoteFormula(formula: { bases?: FormulaIngredient[] | null; additions?: FormulaIngredient[] | null; targetCapsules?: number }, capsuleCountInput?: number): Promise<QuoteResult> {
        const capsuleCountFromInput = isValidCapsuleCount(Number(capsuleCountInput)) ? Number(capsuleCountInput) as CapsuleCount : undefined;
        const capsuleCountFromFormula = isValidCapsuleCount(Number(formula.targetCapsules)) ? Number(formula.targetCapsules) as CapsuleCount : undefined;
        const capsuleCount = capsuleCountFromInput || capsuleCountFromFormula || 9 as CapsuleCount;
        const totalCapsules = capsuleCount * QUOTE_DAYS;

        if (!ALIVE_API_KEY) {
            return {
                available: false,
                reason: "Manufacturer pricing is not configured.",
                capsuleCount,
                totalCapsules,
                weeks: QUOTE_WEEKS,
                currency: "USD",
                mappedIngredients: 0,
                unmappedIngredients: [],
            };
        }

        const allIngredients = [
            ...(formula.bases || []),
            ...(formula.additions || []),
        ]
            .filter((item) => item && item.ingredient && Number(item.amount) > 0)
            .map((item) => ({ ingredient: String(item.ingredient), amount: Number(item.amount) }));

        if (allIngredients.length === 0) {
            return {
                available: false,
                reason: "Formula has no priced ingredients.",
                capsuleCount,
                totalCapsules,
                weeks: QUOTE_WEEKS,
                currency: "USD",
                mappedIngredients: 0,
                unmappedIngredients: [],
            };
        }

        try {
            const catalog = await this.fetchIngredientsCatalog();
            const payloadIngredients: QuoteRequestIngredient[] = [];
            const unmappedIngredients: string[] = [];

            for (const item of allIngredients) {
                const ingredientId = this.resolveManufacturerIngredientId(item.ingredient, catalog);
                if (!ingredientId) {
                    unmappedIngredients.push(item.ingredient);
                    continue;
                }
                // item.amount is total daily dose; divide by capsules/day to get per-capsule fill weight
                const perCapsuleMg = Math.round((item.amount / capsuleCount) * 1000) / 1000;
                payloadIngredients.push({ ingredient_id: ingredientId, weight_in_mg: perCapsuleMg });
            }

            if (payloadIngredients.length === 0) {
                return {
                    available: false,
                    reason: "No mappable ingredients for manufacturer quote.",
                    capsuleCount,
                    totalCapsules,
                    weeks: QUOTE_WEEKS,
                    currency: "USD",
                    mappedIngredients: 0,
                    unmappedIngredients,
                };
            }

            const response = await this.fetchWithTimeout(ALIVE_API_GET_QUOTE_URL, {
                method: "POST",
                headers: {
                    ...this.buildAuthHeaders(),
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
                body: JSON.stringify({
                    ingredients: payloadIngredients,
                    number_of_weeks: QUOTE_WEEKS,
                    capsule_count: totalCapsules,
                }),
            });

            if (!response.ok) {
                throw new Error(`Manufacturer quote API failed: ${response.status}`);
            }

            const quote: any = await response.json();
            const quoteAccepted = quote?.status === true || quote?.success === true;
            if (!quoteAccepted) {
                return {
                    available: false,
                    reason: "Manufacturer quote request was rejected.",
                    capsuleCount,
                    totalCapsules,
                    weeks: QUOTE_WEEKS,
                    currency: "USD",
                    mappedIngredients: payloadIngredients.length,
                    unmappedIngredients,
                };
            }

            // Capture Alive's quote_id for later production order placement
            const quoteId = typeof quote.quote_id === 'string' ? quote.quote_id : undefined;
            const quoteExpiresAt = typeof quote.expires_at === 'string' ? quote.expires_at : undefined;

            // ── Parse Alive's new pricing response fields ──
            // subtotal = raw ingredient cost, discount = practitioner-level discount,
            // shipping_cost = Alive shipping, retail_price = with practitioner markup,
            // total = subtotal - discount + shipping (what we actually pay Alive)
            const aliveSubtotal = Number(quote.subtotal ?? 0);
            const aliveDiscount = Number(quote.discount ?? 0);
            const aliveShippingCost = Number(quote.shipping_cost ?? 0);
            const aliveRetailPrice = Number(quote.retail_price ?? 0);
            const aliveTotal = Number(quote.total ?? 0);

            // Our cost basis is what Alive charges us (total = subtotal - discount + shipping)
            // If the new fields aren't present, fall back to the raw total
            const manufacturerCost = aliveTotal > 0 ? aliveTotal : aliveSubtotal;

            // Apply our margin on top of the manufacturer cost (shipping absorbed, shown as free)
            const subtotal = Math.round(manufacturerCost * MARGIN_MULTIPLIER * 100) / 100;
            const shipping = 0;
            const total = subtotal;

            logger.info('Formula pricing breakdown', {
                capsuleCount,
                totalCapsules,
                aliveSubtotal,
                aliveDiscount,
                aliveShippingCost,
                aliveRetailPrice,
                aliveTotal,
                manufacturerCost,
                marginMultiplier: MARGIN_MULTIPLIER,
                customerTotal: total,
                perDayCustomer: Math.round((total / QUOTE_DAYS) * 100) / 100,
                mappedIngredients: payloadIngredients.length,
                quoteId,
                quoteExpiresAt,
                perCapsuleWeights: payloadIngredients.map(i => ({
                    id: i.ingredient_id,
                    mg: i.weight_in_mg,
                })),
            });

            if (unmappedIngredients.length > 0) {
                logger.warn('Manufacturer quote completed with unmapped ingredients', {
                    unmappedCount: unmappedIngredients.length,
                    unmappedIngredients: unmappedIngredients.slice(0, 10),
                });
            }

            return {
                available: true,
                capsuleCount,
                totalCapsules,
                weeks: QUOTE_WEEKS,
                manufacturerCost,
                manufacturerDiscount: aliveDiscount || undefined,
                manufacturerShipping: aliveShippingCost || undefined,
                manufacturerRetailPrice: aliveRetailPrice || undefined,
                subtotal,
                shipping,
                total,
                currency: "USD",
                mappedIngredients: payloadIngredients.length,
                unmappedIngredients,
                quoteId,
                quoteExpiresAt,
            };
        } catch (error: any) {
            logger.error("Failed to get manufacturer quote", {
                error: error?.message || error,
                isAbort: error?.name === 'AbortError',
                timeoutMs: ALIVE_API_TIMEOUT_MS,
            });
            return {
                available: false,
                reason: error?.name === 'AbortError'
                    ? "Manufacturer quote timed out."
                    : "Manufacturer quote service unavailable.",
                capsuleCount,
                totalCapsules,
                weeks: QUOTE_WEEKS,
                currency: "USD",
                mappedIngredients: 0,
                unmappedIngredients: [],
            };
        }
    }
    /**
     * Place a production order with Alive using the external-order API.
     * Requires the quote_id from a previous /get-quote call plus customer/shipping details.
     * Called after payment succeeds.
     */
    async placeManufacturerOrder(quoteId: string, customerInfo?: ManufacturerOrderCustomerInfo): Promise<ManufacturerOrderResult> {
        if (!ALIVE_API_KEY) {
            return { success: false, error: 'Manufacturer API key not configured.' };
        }

        if (!quoteId) {
            return { success: false, error: 'No quote_id provided.' };
        }

        // Use the new /external-order endpoint if customer info is available,
        // otherwise fall back to the legacy /mix-product endpoint
        if (customerInfo) {
            return this.placeExternalOrder(quoteId, customerInfo);
        }

        return this.placeLegacyMixProductOrder(quoteId);
    }

    /**
     * New external-order API: POST /api/external-order
     */
    private async placeExternalOrder(quoteId: string, customer: ManufacturerOrderCustomerInfo): Promise<ManufacturerOrderResult> {
        try {
            const payload = {
                external_quote_id: quoteId,
                customer_name: customer.customerName,
                email: customer.email,
                phone: customer.phone || '',
                billing_address: {
                    line1: customer.billingAddress.line1,
                    ...(customer.billingAddress.line2 ? { line2: customer.billingAddress.line2 } : {}),
                    city: customer.billingAddress.city,
                    ...(customer.billingAddress.state ? { state: customer.billingAddress.state } : {}),
                    zip: customer.billingAddress.zip,
                    ...(customer.billingAddress.country ? { country: customer.billingAddress.country } : {}),
                },
                shipping_address: {
                    line1: customer.shippingAddress.line1,
                    ...(customer.shippingAddress.line2 ? { line2: customer.shippingAddress.line2 } : {}),
                    city: customer.shippingAddress.city,
                    ...(customer.shippingAddress.state ? { state: customer.shippingAddress.state } : {}),
                    zip: customer.shippingAddress.zip,
                    ...(customer.shippingAddress.country ? { country: customer.shippingAddress.country } : {}),
                },
            };

            logger.info('Placing manufacturer external order with Alive', {
                quoteId,
                customerName: customer.customerName,
                email: customer.email,
            });

            const response = await this.fetchWithTimeout(ALIVE_API_EXTERNAL_ORDER_URL, {
                method: 'POST',
                headers: {
                    ...this.buildAuthHeaders(),
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const text = await response.text().catch(() => '');
                logger.error('Manufacturer external-order API failed', { quoteId, status: response.status, body: text });
                return { success: false, error: `Manufacturer external-order API returned ${response.status}` };
            }

            const result: any = await response.json();
            logger.info('Manufacturer external-order response', { quoteId, result });

            const orderId = result?.order_id || result?.id || quoteId;
            return { success: true, orderId: String(orderId) };
        } catch (error: any) {
            logger.error('Failed to place manufacturer external order', {
                quoteId,
                error: error?.message || error,
                isAbort: error?.name === 'AbortError',
            });
            return {
                success: false,
                error: error?.name === 'AbortError'
                    ? 'Manufacturer order request timed out.'
                    : `Manufacturer order failed: ${error?.message || 'unknown error'}`,
            };
        }
    }

    /**
     * Legacy /mix-product fallback (used when customer info is not available)
     */
    private async placeLegacyMixProductOrder(quoteId: string): Promise<ManufacturerOrderResult> {
        try {
            logger.info('Placing manufacturer order with Alive (legacy mix-product)', { quoteId });

            const response = await this.fetchWithTimeout(ALIVE_API_MIX_PRODUCT_URL, {
                method: 'POST',
                headers: {
                    ...this.buildAuthHeaders(),
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ quote_id: quoteId }),
            });

            if (!response.ok) {
                const text = await response.text().catch(() => '');
                logger.error('Manufacturer mix-product API failed', { quoteId, status: response.status, body: text });
                return { success: false, error: `Manufacturer order API returned ${response.status}` };
            }

            const result: any = await response.json();
            logger.info('Manufacturer mix-product response', { quoteId, result });

            const orderId = result?.order_id || result?.id || quoteId;
            return { success: true, orderId: String(orderId) };
        } catch (error: any) {
            logger.error('Failed to place manufacturer order (legacy)', {
                quoteId,
                error: error?.message || error,
                isAbort: error?.name === 'AbortError',
            });
            return {
                success: false,
                error: error?.name === 'AbortError'
                    ? 'Manufacturer order request timed out.'
                    : `Manufacturer order failed: ${error?.message || 'unknown error'}`,
            };
        }
    }

}

export const manufacturerPricingService = new ManufacturerPricingService();
