import logger from "../../infra/logging/logger";

const ALIVE_API_BASE_URL = (process.env.ALIVE_API_BASE_URL || "https://dev.aliveinnovations.com/api").replace(/\/$/, "");
const ALIVE_API_INGREDIENTS_URL = process.env.ALIVE_API_INGREDIENTS_URL || `${ALIVE_API_BASE_URL}/ingredients`;
const ALIVE_API_GET_QUOTE_URL = process.env.ALIVE_API_GET_QUOTE_URL || `${ALIVE_API_BASE_URL}/get-quote`;
const ALIVE_API_MIX_PRODUCT_URL = process.env.ALIVE_API_MIX_PRODUCT_URL || `${ALIVE_API_BASE_URL}/mix-product`;
const ALIVE_API_EXTERNAL_ORDER_URL = process.env.ALIVE_API_EXTERNAL_ORDER_URL || `${ALIVE_API_BASE_URL}/external-order`;
const ALIVE_API_KEY = process.env.ALIVE_API_KEY || "";
const ALIVE_API_ORIGIN = process.env.ALIVE_API_ORIGIN || "";

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

type OrderCustomerData = {
    customerName?: string;
    email?: string;
    phone?: string;
    billingCity?: string;
    billingZip?: string;
    billingLine1?: string;
    shippingCity?: string;
    shippingZip?: string;
    shippingLine1?: string;
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

            // Apply margin to manufacturer SUBTOTAL (cost only, excludes Alive shipping).
            // Shipping is absorbed into the margin and shown as free to the customer.
            const aliveShipping = Number(quote.total ?? 0) - Number(quote.subtotal ?? quote.total ?? 0);
            const manufacturerCost = Number(quote.subtotal ?? Number(quote.total ?? 0));
            const subtotal = Math.round(manufacturerCost * MARGIN_MULTIPLIER * 100) / 100;
            const shipping = 0;
            const total = subtotal;

            logger.info('Formula pricing breakdown', {
                capsuleCount,
                totalCapsules,
                manufacturerCost,
                aliveShipping: Math.round(aliveShipping * 100) / 100,
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
                manufacturerCost: manufacturerCost,
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
     * Place a production order with Alive using a previously obtained quote_id.
     * Called after Stripe payment succeeds.
     * Uses the /external-order endpoint with full customer and address data.
     */
    async placeManufacturerOrder(quoteId: string, customerData?: OrderCustomerData): Promise<ManufacturerOrderResult> {
        if (!ALIVE_API_KEY) {
            return { success: false, error: 'Manufacturer API key not configured.' };
        }

        if (!quoteId) {
            return { success: false, error: 'No quote_id provided.' };
        }

        try {
            logger.info('Placing manufacturer order with Alive', { quoteId });

            // Build the external-order payload with customer data
            const payload: Record<string, any> = {
                external_quote_id: quoteId,
            };

            if (customerData?.customerName) {
                payload.customer_name = customerData.customerName;
            }
            if (customerData?.email) {
                payload.email = customerData.email;
            }
            if (customerData?.phone) {
                payload.phone = customerData.phone;
            }

            // Billing address
            if (customerData?.billingLine1 || customerData?.billingCity || customerData?.billingZip) {
                payload.billing_address = {};
                if (customerData.billingLine1) payload.billing_address.line1 = customerData.billingLine1;
                if (customerData.billingCity) payload.billing_address.city = customerData.billingCity;
                if (customerData.billingZip) payload.billing_address.zip = customerData.billingZip;
            }

            // Shipping address (default to billing if not provided)
            if (customerData?.shippingLine1 || customerData?.shippingCity || customerData?.shippingZip) {
                payload.shipping_address = {};
                if (customerData.shippingLine1) payload.shipping_address.line1 = customerData.shippingLine1;
                if (customerData.shippingCity) payload.shipping_address.city = customerData.shippingCity;
                if (customerData.shippingZip) payload.shipping_address.zip = customerData.shippingZip;
            } else if (payload.billing_address) {
                // Use billing address as default if no shipping address provided
                payload.shipping_address = { ...payload.billing_address };
            }

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
                logger.error('Manufacturer order API failed', { quoteId, status: response.status, body: text });
                return { success: false, error: `Manufacturer order API returned ${response.status}` };
            }

            const result: any = await response.json();
            logger.info('Manufacturer order response', { quoteId, result });

            // Alive may return an order_id, confirmation, etc.
            const orderId = result?.order_id || result?.id || quoteId;
            return { success: true, orderId: String(orderId) };
        } catch (error: any) {
            logger.error('Failed to place manufacturer order', {
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
