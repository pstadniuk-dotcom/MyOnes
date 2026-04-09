https://secure.easypaydirectgateway.com

# Gateway Emulator  Third Party Shopping Carts

We have designed our gateway to be able to handle transaction submissions and responses in the Authorize.Net format. We call this our Gateway Emulator.

To use the Gateway Emulator, your shopping cart or application must support the Authorize.Net AIM or SIM method of integration. If the application supports the AIM or SIM method, you simply need to change the transaction POST URL to our Gateway Emulator URL.

The Gateway does not support the emulation of XML AIM, CIM, ARB, DPM, Card Present or Transaction Details APIs.

Our Gateway Emulator URL is:

|     |     |
| --- | --- |
| AIM: | https://secure.easypaydirectgateway.com/gateway/transact.dll |
| SIM: | https://secure.easypaydirectgateway.com/cart/ausi.php |

You will need to change any production and test Authorize.Net URLs to one of the above URLs. The following URLs should be replaced:

|     |
| --- |
| https://secure.authorize.net/gateway/transact.dll |
| https://test.authorize.net/gateway/transact.dll |

Some applications will not contain the test URL. In that case, you will only be changing one URL. Once you have updated the URLs to point to us, the application will submit transactions without needing changes to the code base.

You will then need to configure the Authorize.Net AIM or SIM payment module with the following credentials:

- x\_login will always be api\_key.
- x\_tran\_key is your security key.
- The MD5 Hash is the word "gateway" without the marks.

For testing, you can use the username and password of "demo" and "password".

CIT/MIT is supported even though the official AIM API does not support it. Please use the variable names and values [documented under the Payment API](https://secure.easypaydirectgateway.com/gw/merchants/resources/integration/integration_portal.php#credential_on_file_information) on all relevant transactions.

* * *

## Authorize.Net Modern XML Emulator

If your application is using Authorize.Net's current XML API, then you can connect using our newest emulator. Like the above-mentioned
emulators, this will accept requests in the same XML format that Auth.Net would accept, so it's just a matter of changing
your POST URL to the one below and using your gateway credentials for authentication. This emulator also emulates the
response so that should look the same to your software.

Our Modern XML Emulator URL is:

|     |
| --- |
| https://secure.easypaydirectgateway.com/api/transrequest.php |

For authentication, this API looks for "name" and "transactionKey".

- "name" can be anything, as it is not used for authentication.
- "transactionKey" is your API Security Key.

* * *

## Sparrow

If your application is using SparrowOne's Services API, you can connect your software to the gateway via this emulator. Simply replace the POST URL in your software to the following address and you can submit transactions, add update, and delete Customer Vault IDs, and create recurring subscriptions.

|     |
| --- |
| https://secure.easypaydirectgateway.com/api/spar.php |

Authentication uses your merchant account's API Security Key in the 'mkey' variable.

# Methodology  Payment API

## Transactions

![](<Base64-Image-Removed>)

##### Steps:

1\. The customer sends their payment information to the merchant's web site.

2\. The merchant web site posts the payment data to the Payment Gateway.

3\. The Payment Gateway responds immediately with the results of the transactions.

4\. The merchant web site displays the appropriate message to the customer.

The communication method used to send messages to the Payment Gateway's server is the standard HTTP protocol over an SSL connection.

In the Payment API method, the communications with the cardholder (Steps 1 and 4) are developed completely by the merchant and therefore are not defined by the Payment Gateway. Step 1 should simply collect the payment data from the cardholder and Step 4 should display the appropriate transaction receipt or declined message.

In Step 2, transaction details should be delivered to the Payment Gateway using the POST method with the appropriate variables defined below posted along with the request.

In Step 3, the transaction responses are returned in the body of the HTTP response in a query string name/value format delimited by ampersands. For example: variable1=value1&variable2=value2&variable3=value3

## Customer Vault

The Customer Vault was designed specifically for businesses of any size to address concerns about handling customer payment information. Visa and MasterCard have instituted the Payment Card Industry (PCI) Data Security to protect cardholder data, wherever it resides, ensuring that members, merchants, and service providers maintain the highest information security standards.

These associations have also deemed that merchants will be held liable for any breach of cardholder data. This has become a major concern for merchants who handle credit card or electronic check payments. The Customer Vault is designed for these merchants who desire to avoid the tremendous costs and resources involved in becoming PCI compliant under these circumstances.

The Customer Vault does this by allowing merchants to transmit their payment information through a Secure Sockets Layer (SSL) connection for storage in our Level 1 PCI certified data facility. Once the customer record has been securely transmitted to the Customer Vault, the merchant can then initiate transactions remotely without having to access cardholder information directly. This process is accomplished without the merchant storing the customer's payment information in their local database or payment application.

# Transaction Types  Payment API

## Sale (sale)

Transaction sales are submitted and immediately flagged for settlement.

## Authorization (auth)

Transaction authorizations are authorized immediately but are not flagged for settlement. These transactions must be flagged for settlement using the capture transaction type.

## Capture (capture)

Transaction captures flag existing authorizations for settlement. Only authorizations can be captured. Captures can be submitted for an amount equal to or less than the original authorization.

## Void (void)

Transaction voids will cancel an existing sale or captured authorization. In addition, non-captured authorizations can be voided to prevent any future capture. Voids can only occur if the transaction has not been settled.

## Refund (refund)

Transaction refunds will reverse a previously settled or pending settlement transaction. If the transaction has not been settled, a transaction void can also reverse it.

## Credit (credit)

Transaction credits apply an amount to the cardholder's card that was not originally processed through the Gateway. In most situations credits are disabled as transaction refunds should be used instead.

## Validate (validate)

This action is used for doing an "Account Verification" on the cardholder's credit card without actually doing an authorization.

## Update (update)

Transaction updates can be used to update previous transactions with specific order information, such as a tracking number and shipping carrier.

# Transaction Variables  Payment API

## POST URL

|     |     |
| --- | --- |
| POST URL: | https://secure.easypaydirectgateway.com/api/transact.php |

## Sale/Authorization/Credit/Validate/Offline

| Variable Name | Description |
| --- | --- |
| type\* | The type of transaction to be processed.<br>Values: 'sale', 'auth', 'credit', 'validate', or 'offline' |
| security\_key\* | API Security Key assigned to a merchant account.<br> New keys can be generated from the merchant control panel in Settings > Security Keys |
| payment\_token | The tokenized version of the customer's card or check information. This will be generated by [Collect.js](https://secure.easypaydirectgateway.com/merchants/resources/integration/integration_portal.php#cjs_methodology) and is usable only once. |
| transaction\_session\_id‡‡‡‡ | A single use session ID used by Kount to link the transaction and Data Collector information together. This ID should be generated every time a payment form is loaded by the cardholder, and be random/unpredictable (do not use sequential IDs). This ID should not be reused within a 30 day period. This can be used with [Collect.js](https://secure.easypaydirectgateway.com/merchants/resources/integration/integration_portal.php#cjs_methodology) or the Payment API when using the [Kount DDC with Gateway.js.](https://secure.easypaydirectgateway.com/merchants/resources/integration/integration_portal.php#gjs_methodology)<br>Format: alphanumeric, 32 characters required |
| googlepay\_payment\_data | The encrypted token created when [integration directly to the Google Pay SDK](https://secure.easypaydirectgateway.com/merchants/resources/integration/integration_portal.php#googlepay_variables). |
| ccnumber\*\* | Credit card number. |
| ccexp\*\* | Credit card expiration date.<br>Format: MMYY |
| cvv | The card security code. While this is not required, it is strongly recommended. |
| checkname\\*\\*\\* | The name on the customer's ACH account. |
| checkaba\\*\\*\\* | The customer's bank routing number. |
| checkaccount\\*\\*\\* | The customer's bank account number. |
| account\_holder\_type | The type of ACH account the customer has.<br>Values: 'business' or 'personal' |
| account\_type | The ACH account entity of the customer.<br>Values: 'checking' or 'savings' |
| sec\_code | The Standard Entry Class code of the ACH transaction.<br>Values: 'PPD', 'WEB', 'TEL', or 'CCD' |
| checkaccountvalidation | Use account validation on this ACH transaction.<br>Supported on iStream only. Values: 'true' or 'false' |
| amount | Total amount to be charged. For validate, the amount must be omitted or set to 0.00.<br>Format: x.xx |
| surcharge | Surcharge amount.<br>Format: x.xx |
| convenience\_fee | Convenience fee amount.<br>Format: x.xx |
| misc\_fee | Miscellaneous fee amount.<br>Format: x.xx |
| misc\_fee\_name | Custom miscellaneous fee name.<br>Default: Miscellaneous Fee |
| cash\_discount | How much less a customer paid due to a cash discount.<br>Format: x.xx, only applicable to cash and check transactions |
| tip | The final tip amount, included in the transaction, associated with the purchase<br>Format: x.xx |
| currency | The transaction currency. Format: ISO 4217 |
| payment\\*\\*\\* | The type of payment.<br>Default: 'creditcard'<br>Values: 'creditcard', 'check', or 'cash' |
| processor\_id | If using Multiple MIDs, route to this processor (processor\_id is obtained under Settings → Transaction Routing in the Control Panel). |
| authorization\_code‡ | Specify authorization code. For use with "offline" action only. |
| dup\_seconds | Sets the time in seconds for duplicate transaction checking on supported processors. Set to 0 to disable duplicate checking. This value should not exceed 7862400. |
| descriptor | Set payment descriptor on supported processors. |
| descriptor\_phone | Set payment descriptor phone on supported processors. |
| descriptor\_address | Set payment descriptor address on supported processors. |
| descriptor\_city | Set payment descriptor city on supported processors. |
| descriptor\_state | Set payment descriptor state on supported processors. |
| descriptor\_postal | Set payment descriptor postal code on supported processors. |
| descriptor\_country | Set payment descriptor country on supported processors. |
| descriptor\_mcc | Set payment descriptor mcc on supported processors. |
| descriptor\_merchant\_id | Set payment descriptor merchant id on supported processors. |
| descriptor\_url | Set payment descriptor url on supported processors. |
| billing\_method | Should be set to 'recurring' to mark payment as a recurring transaction or 'installment' to mark payment as an installment transaction.<br>Values: 'recurring', 'installment' |
| billing\_number | Specify installment billing number, on supported processors. For use when "billing\_method" is set to installment.<br>Values: 0-99 |
| billing\_total | Specify installment billing total on supported processors. For use when "billing\_method" is set to installment. |
| order\_template | Order template ID. |
| order\_description | Order description.<br>Legacy variable includes: orderdescription |
| orderid | Order Id |
| ipaddress | IP address of cardholder, this field is recommended.<br>Format: xxx.xxx.xxx.xxx |
| tax\\*\\*\\*\* | The sales tax included in the transaction amount associated with the purchase. Setting tax equal to any negative value indicates an order that is exempt from sales tax.<br> Default: '0.00' <br> Format: x.xx |
| shipping\\*\\*\\*\* | Total shipping amount. |
| ponumber\\*\\*\\*\* | Original purchase order. |
| first\_name | Cardholder's first name.<br>Legacy variable includes: firstname |
| last\_name | Cardholder's last name<br>Legacy variable includes: lastname |
| company | Cardholder's company |
| address1 | Card billing address |
| address2 | Card billing address, line 2 |
| city | Card billing city |
| state | Card billing state.<br>Format: CC |
| zip | Card billing zip code |
| country | Card billing country.<br>Country codes are as shown in ISO 3166. Format: CC |
| phone | Billing phone number |
| fax | Billing fax number |
| email | Billing email address |
| social\_security\_number | Customer's social security number, checked against bad check writers database if check verification is enabled. |
| drivers\_license\_number | Driver's license number. |
| drivers\_license\_dob | Driver's license date of birth. |
| drivers\_license\_state | The state that issued the customer's driver's license. |
| shipping\_firstname | Shipping first name |
| shipping\_lastname | Shipping last name |
| shipping\_company | Shipping company |
| shipping\_address1 | Shipping address |
| shipping\_address2 | Shipping address, line 2 |
| shipping\_city | Shipping city |
| shipping\_state | Shipping state<br>Format: CC |
| shipping\_zip | Shipping zip code |
| shipping\_country | Shipping country<br>Country codes are as shown in ISO 3166. Format: CC |
| shipping\_email | Shipping email address |
| merchant\_defined\_field\_# | You can pass custom information in up to 20 fields.<br>Format: merchant\_defined\_field\_1=Value |
| customer\_receipt | If set to true, when the customer is charged, they will be sent a transaction receipt.<br>Values: 'true' or 'false' |
| signature\_image | Cardholder signature image. For use with "sale" and "auth" actions only.<br>Format: base64 encoded raw PNG image. (16kiB maximum) |
| cardholder\_auth‡‡ | Set 3D Secure condition. Value used to determine E-commerce indicator (ECI).<br>Values: 'verified' or 'attempted' |
| cavv‡‡ | Cardholder authentication verification value.<br>Format: base64 encoded |
| xid‡‡ | Cardholder authentication transaction id.<br>Format: base64 encoded |
| three\_ds\_version‡‡ | 3DSecure version.<br>Examples: "2.0.0" or "2.2.0" |
| directory\_server\_id | Directory Server Transaction ID. May be provided as part of 3DSecure 2.0 authentication.<br>Format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx |
| source\_transaction\_id | Specifies a payment gateway transaction id in order to associate payment information with a Subscription or Customer Vault record. Must be set with a 'recurring' or 'customer\_vault' action. |
| pinless\_debit\_override | Set to 'Y' if you have Pinless Debit Conversion enabled but want to opt out for this transaction. Feature applies to selected processors only. |
| sca\_exemption | Specifies an exemption to Strong Customer Authentication (SCA) requirements for a transaction. Qualifying transactions bypass additional authentication steps. Available on select Processors; contact your Account Manager for details. <br> Values: "na", "low\_value", "tra\_exemption", "trusted\_merchant", "secure\_corporate\_payment", "merchant\_initiated\_transaction", "recurring\_payment", or "sca\_delegation" |
|  |  |
| Recurring specific fields |
| recurring | Recurring action to be processed.<br>Values: add\_subscription |
| plan\_id | Create a subscription tied to a Plan ID if the sale/auth transaction is successful. |
| plan\_payments | The number of payments before the recurring plan is complete.<br>Note: Use '0' for 'until canceled' |
| plan\_amount | The plan amount to be charged each billing cycle.<br>Format: x.xx |
| day\_frequency | How often, in days, to charge the customer. Cannot be set with 'month\_frequency' or 'day\_of\_month'. |
| month\_frequency | How often, in months, to charge the customer. Cannot be set with 'day\_frequency'. Must be set with 'day\_of\_month'.<br>Values: 1 through 24 |
| day\_of\_month | The day that the customer will be charged. Cannot be set with 'day\_frequency'. Must be set with 'month\_frequency'.<br>Values: 1 through 31 - for months without 29, 30, or 31 days, the charge will be on the last day |
| start\_date | The first day that the customer will be charged.<br>Format: YYYYMMDD |
| Customer Vault specific fields |
| customer\_vault | Associate payment information with a Customer Vault record if the transaction is successful.<br>Values: 'add\_customer' or 'update\_customer' |
| customer\_vault\_id | Specifies a Customer Vault id. If not set, the payment gateway will randomly generate a Customer Vault id. |
| Customer Token Vault specific fields |
| network\_tokenize | Overrides the Customer Token Vault settings and tokenizes the transaction if eligible.<br>Values: '0 (false)' or '1 (true)'<br>Default: '0' |
| Stored Credentials (CIT/MIT) |
| initiated\_by | Who initiated the transaction.<br>Values: 'customer' or 'merchant' |
| initial\_transaction\_id | Original payment gateway transaction id. |
| stored\_credential\_indicator | The indicator of the stored credential.<br>Values: 'stored' or 'used'<br>Use **'stored'** when processing the initial transaction in which you are storing a customer's payment details (customer credentials) in the Customer Vault or other third-party payment storage system.<br>Use **'used'** when processing a subsequent or follow-up transaction using the customer payment details (customer credentials) you have already stored to the Customer Vault or third-party payment storage method. |
| Level III specific order fields |
| shipping† | Freight or shipping amount included in the transaction amount.<br>Default: '0.00'<br>Format: x.xx |
| tax† | The sales tax, included in the transaction amount, associated with the purchase. Setting tax equal to any negative value indicates an order that is exempt from sales tax.<br>Default: '0.00'<br>Format: x.xx |
| ponumber† | Purchase order number supplied by cardholder |
| orderid† | Identifier assigned by the merchant. This defaults to gateway transaction id. |
| shipping\_country† | Shipping country (e.g. US)<br>Format: CC |
| shipping\_postal† | Postal/ZIP code of the address where purchased goods will be delivered. This field can be identical to the 'ship\_from\_postal' if the customer is present and takes immediate possession of the goods. |
| ship\_from\_postal† | Postal/ZIP code of the address from where purchased goods are being shipped, defaults to merchant profile postal code. |
| summary\_commodity\_code† | 4 character international description code of the overall goods or services being supplied. The acquirer or processor will provide a list of current codes. |
| duty\_amount | Amount included in the transaction amount associated with the import of purchased goods.<br>Default: '0.00'<br>Format: x.xx |
| discount\_amount | Amount included in the transaction amount of any discount applied to complete order by the merchant.<br>Default: '0.00'<br>Format: x.xx |
| national\_tax\_amount | The national tax amount included in the transaction amount.<br>Default: '0.00'<br>Format: x.xx |
| alternate\_tax\_amount | Second tax amount included in the transaction amount in countries where more than one type of tax can be applied to the purchases.<br>Default: '0.00'<br>Format: x.xx |
| alternate\_tax\_id | Tax identification number of the merchant that reported the alternate tax amount. |
| vat\_tax\_amount | Contains the amount of any value added taxes which can be associated with the purchased item.<br>Default: '0.00'<br>Format: x.xx |
| vat\_tax\_rate | Contains the tax rate used to calculate the sales tax amount appearing. Can contain up to 2 decimal places, e.g. 1% = 1.00.<br>Default: '0.00'<br>Format: x.xx |
| vat\_invoice\_reference\_number | Invoice number that is associated with the VAT invoice. |
| customer\_vat\_registration | Value added tax registration number supplied by the cardholder. |
| merchant\_vat\_registration | Government assigned tax identification number of the merchant for whom the goods or services were purchased from. |
| order\_date | Purchase order date, defaults to the date of the transaction.<br>Format: YYMMDD |
| Level III specific line item detail fields |
| item\_product\_code\_#† | Merchant defined description code of the item being purchased. |
| item\_description\_#† | Description of the item(s) being supplied. |
| item\_commodity\_code\_#† | International description code of the individual good or service being supplied. The acquirer or processor will provide a list of current codes. |
| item\_unit\_of\_measure\_#† | Code for units of measurement as used in international trade.<br>Default: 'EACH' |
| item\_unit\_cost\_#† | Unit cost of item purchased, may contain up to 4 decimal places. |
| item\_quantity\_#† | Quantity of the item(s) being purchased.<br>Default: '1' |
| item\_total\_amount\_#† | Purchase amount associated with the item. Defaults to: 'item\_unit\_cost\_#' x 'item\_quantity\_#' rounded to the nearest penny. |
| item\_tax\_amount\_#† | Amount of sales tax on specific item. Amount should not be included in 'total\_amount\_#'.<br>Default: '0.00'<br>Format: x.xx |
| item\_tax\_rate\_#† | Percentage representing the value-added tax applied.<br>Default: '0.00' |
| item\_discount\_amount\_# | Discount amount which can have been applied by the merchant on the sale of the specific item. Amount should not be included in 'total\_amount\_#'. |
| item\_discount\_rate\_# | Discount rate for the line item. 1% = 1.00.<br>Default: '0.00' |
| item\_tax\_type\_# | Type of value-added taxes that are being used. |
| item\_alternate\_tax\_id\_# | Tax identification number of the merchant that reported the alternate tax amount. |
| Payment Facilitator Specific Fields |
| payment\_facilitator\_id‡‡‡ | Payment Facilitator/Aggregator/ISO's ID Number |
| submerchant\_id‡‡‡ | Sub-merchant Account ID |
| submerchant\_name‡‡‡ | Sub-merchant's Name |
| submerchant\_address‡‡‡ | Sub-merchant's Address |
| submerchant\_city‡‡‡ | Sub-merchant's City |
| submerchant\_state‡‡‡ | Sub-merchant's State |
| submerchant\_postal‡‡‡ | Sub-merchant's Zip/Postal Code |
| submerchant\_country‡‡‡ | Sub-merchant's Country |
| submerchant\_phone‡‡‡ | Sub-merchant's Phone Number |
| submerchant\_email‡‡‡ | Sub-merchant's Email Address |
| submerchant\_url‡‡‡ | Sub-merchant's URL |
| submerchant\_airn‡‡‡ | Sub-merchant's Acquirer Internal Reference Number, used for Discover transactions |
| HSA/FSA Specific Fields |
| fsa\_amount\_healthcare‡‡‡‡‡ | Amount of the purchase devoted to healthcare <br>Visa/Mastercard Only |
| fsa\_amount\_vision‡‡‡‡‡ | Amount of the purchase devoted to vision/optical costs <br>Visa Only |
| fsa\_amount\_clinic | Amount of the purchase devoted to clinic or other qualified medical costs <br>Visa Only |
| fsa\_amount\_dental | Amount of the purchase devoted to dental costs <br>Visa Only |

|     |     |
| --- | --- |
| \* | Always required |
| \*\* | Required for credit card transactions |
| \\*\\*\\* | Required for ACH transactions |
| \\*\\*\\*\* | Required for Level 2 transactions |
| † | Required for Level 3 transactions |
| ‡ | Required for offline transactions |
| ‡‡ | Required for 3D Secure transactions |
| ‡‡‡ | Required fields for Payment Facilitator enabled transactions vary by card brand |
| ‡‡‡‡ | Required for API transactions using the Kount Service |
| ‡‡‡‡‡ | FSA/HSA transactions require either fsa\_amount\_healthcare or fsa\_amount\_vision; other fsa\_amount fields are optional |

#### Notes:

- Level II fields are required for Level II processing.
- Level II and Level III fields are required for Level III processing.
- You can pass only credit card or e-check transaction variables in a request, not both in the same request.
- Certain banks may require some optional fields.
- Some characters output from base64 encoding can not be passed directly into the API (i.e. "+") so ensure these fields are also properly URL encoded.

## Capture

| Variable Name | Description |
| --- | --- |
| type\* | Type of transaction.<br>Values: 'capture' |
| security\_key\* | API Security Key assigned to a merchant account.<br> New keys can be generated from the merchant control panel in Settings > Security Keys |
| transactionid\* | Original payment gateway transaction id |
| amount\* | Total amount to be settled. This amount must be equal to or less than the original authorized amount.<br>Format: x.xx |
| tracking\_number | Shipping tracking number |
| shipping\_carrier | Shipping carrier.<br>Values: 'ups', 'fedex', 'dhl', or 'usps' |
| orderid | Order id. |
| signature\_image | Cardholder signature image.<br>Format: base64 encoded raw PNG image. (16kiB maximum) |

|     |     |
| --- | --- |
| \* | Always required |

## Void

| Variable Name | Description |
| --- | --- |
| type\* | Type of transaction.<br>Values: 'void' |
| security\_key\* | API Security Key assigned to a merchant account.<br> New keys can be generated from the merchant control panel in Settings > Security Keys |
| transactionid\* | Original payment gateway transaction id |
| void\_reason\*\* | Reason the EMV transaction is being voided.<br>Values: 'fraud', 'user\_cancel', 'icc\_rejected', 'icc\_card\_removed', 'icc\_no\_confirmation', or 'pos\_timeout' |
| payment\\*\\*\\* | The type of payment.<br>Default: 'creditcard'<br>Values: 'creditcard' or 'check' |

|     |     |
| --- | --- |
| \* | Always required |
| \*\* | Conditionally required for EMV transactions |
| \\*\\*\\* | Required for ACH transactions |

## Refund

| Variable Name | Description |
| --- | --- |
| type\* | Type of transaction.<br>Values: 'refund' |
| security\_key\* | API Security Key assigned to a merchant account.<br> New keys can be generated from the merchant control panel in Settings > Security Keys |
| transactionid\* | Original payment gateway transaction id |
| amount | Total amount to be refunded. This amount may be equal to or less than the settled amount. Setting the amount to 0.00 will refund the entire amount.<br>Format: x.xx |
| payment\*\* | The type of payment.<br>Default: 'creditcard'<br>Values: 'creditcard' or 'check' |

|     |     |
| --- | --- |
| \* | Always required |
| \*\* | Required for ACH transactions |

## Update

| Variable Name | Description |
| --- | --- |
| type\* | Type of transactions.<br>Values: 'update' |
| security\_key\* | API Security Key assigned to a merchant account.<br> New keys can be generated from the merchant control panel in Settings > Security Keys |
| transactionid\* | Original payment gateway transaction id |
| payment\*\* | The type of payment.<br>Default: 'creditcard'<br>Values: 'creditcard' or 'check' |
| tracking\_number | Shipping tracking number |
| shipping | Total shipping amount.<br>Format: x.xx |
| shipping\_postal | Postal/ZIP code of the address where purchased goods will be delivered. This field can be identical to the 'ship\_from\_postal' if the customer is present and takes immediate possession of the goods. |
| ship\_from\_postal | Postal/ZIP code of the address from where purchased goods are being shipped, defaults to merchant profile postal code. |
| shipping\_country | Shipping Country Code. |
| shipping\_carrier | Shipping carrier.<br>Values: 'ups', 'fedex', 'dhl', or 'usps' |
| shipping\_date | Shipping date.<br>Format: YYYYMMDD |
| order\_description | Order Description.<br>Legacy variable includes: orderdescription |
| order\_date | Order date.<br>Format: YYYYMMDD |
| customer\_receipt | If set to true, when the customer is charged, they will be sent a transaction receipt.<br>Values: 'true' or 'false' |
| signature\_image | Cardholder signature image.<br>Format: base64 encoded raw PNG image. (16kiB maximum) |
| ponumber | Cardholder's purchase order number. |
| summary\_commodity\_code | 4 character international description code of the overall goods or services being supplied. The acquirer or processor will provide a list of current codes. |
| duty\_amount | Amount included in the transaction amount associated with the import of purchased goods.<br>Format: x.xx |
| discount\_amount | Amount included in the transaction amount of any discount applied to complete order by the merchant.<br>Format: x.xx |
| tax | The sales tax, included in the transaction amount, associated with the purchase. Setting tax equal to any negative value indicates an order that is exempt from sales tax.<br>Default: '0.00'<br>Format: x.xx |
| national\_tax\_amount | The national tax amount included in the transaction amount.<br>Format: x.xx |
| alternate\_tax\_amount | Second tax amount included in the transaction amount in countries where more than one type of tax can be applied to the purchases.<br>Format: x.xx |
| alternate\_tax\_id | Tax identification number of the merchant that reported the alternate tax amount. |
| vat\_tax\_amount | Contains the amount of any value added taxes which can be associated with the purchased item. |
| vat\_tax\_rate | Contains the tax rate used to calculate the sales tax amount appearing. Can contain up to 2 decimal places, e.g. 1% = 1.00. |
| vat\_invoice\_reference\_number | Invoice number that is associated with the VAT invoice. |
| customer\_vat\_registration | Value added tax registration number supplied by the cardholder. |
| merchant\_vat\_registration | Government assigned tax identification number of the merchant for whom the goods or services were purchased from. |
| merchant\_defined\_field\_# | Merchant Defined Fields.<br>Format: merchant\_defined\_field\_1=Value |

|     |     |
| --- | --- |
| \* | Always required |
| \*\* | Required for ACH transactions |

# Invoicing Variables  Payment API

## POST URL

|     |     |
| --- | --- |
| POST URL: | https://secure.easypaydirectgateway.com/api/transact.php |

## Create Invoice

| Variable Name | Description |
| --- | --- |
| invoicing\* | Create a new invoice and email it to the customer.<br>Values: 'add\_invoice' |
| security\_key\* | API Security Key assigned to a merchant account.<br> New keys can be generated from the merchant control panel in Settings > Security Keys |
| amount\* | Total amount to be invoiced. Must be greater than 0.00.<br>Format: x.xx |
| email\* | Billing email address<br>An invoice will be sent to this address when it is created. |
| payment\_terms | When the invoice should be paid<br>Default: 'upon\_receipt'<br>Values: 'upon\_receipt', or integers from 0-999. |
| payment\_methods\_allowed | What payment methods a customer may use when paying invoice.<br>Defaults to all available payment methods available in your merchant account<br>Values: 'cc', 'ck', and 'cs'. Multiple payment types can be selected by comma-separating values. |
| processor\_id | If using Multiple MIDs, route to this processor (processor\_id is obtained under Settings → Transaction Routing in the Control Panel).<br>If allowing multiple payment types, one processor\_id can be selected per payment type by submitting comma-separated values. |
| currency | The transaction currency.<br>Format: ISO 4217 |
| order\_description | Order description.<br>Legacy variable includes: orderdescription |
| orderid | Order ID. |
| customer\_id | Customer ID. |
| customer\_tax\_id | Customer Tax ID. |
| tax | Total sales tax amount. |
| shipping | Total shipping amount. |
| ponumber | Original purchase order. |
| first\_name | Cardholder's first name.<br>Legacy variable includes: firstname |
| last\_name | Cardholder's last name.<br>Legacy variable includes: lastname |
| company | Cardholder's company. |
| address1 | Card billing address. |
| address2 | Card billing address, line 2. |
| city | Card billing city. |
| state | Card billing state.<br>Format: CC |
| zip | Card billing zip code. |
| country | Card billing country.<br>Country codes are as shown in ISO 3166. Format: CC |
| phone | Billing phone number. |
| fax | Billing fax number. |
| website | Customer website. |
| shipping\_firstname | Shipping first name. |
| shipping\_lastname | Shipping last name. |
| shipping\_company | Shipping company. |
| shipping\_address1 | Shipping address. |
| shipping\_address2 | Shipping address, line 2. |
| shipping\_city | Shipping city. |
| shipping\_state | Shipping state.<br>Format: CC |
| shipping\_zip | Shipping zip code. |
| shipping\_country | Shipping country.<br>Country codes are as shown in ISO 3166. Format: CC |
| shipping\_email | Shipping email address. |
| merchant\_defined\_field\_# | You can pass custom information in up to 20 fields.<br>Format: merchant\_defined\_field\_1=Value |
| Product Information |
| item\_product\_code\_# | Merchant defined description code of the item being purchased. |
| item\_description\_# | Description of the item(s) being supplied. |
| item\_commodity\_code\_# | International description code of the individual good or service being supplied. The acquirer or processor will provide a list of current codes. |
| item\_unit\_of\_measure\_# | Code for units of measurement as used in international trade.<br>Default: 'EACH' |
| item\_unit\_cost\_# | Unit cost of item purchased, may contain up to 4 decimal places. |
| item\_quantity\_# | Quantity of the item(s) being purchased.<br>Default: '1' |
| item\_total\_amount\_# | Purchase amount associated with the item. Defaults to: 'item\_unit\_cost\_#' x 'item\_quantity\_#' rounded to the nearest penny. |
| item\_tax\_amount\_# | Amount of sales tax on specific item. Amount should not be included in 'total\_amount\_#'.<br>Default: '0.00'<br>Format: x.xx |
| item\_tax\_rate\_# | Percentage representing the value-added tax applied.<br>Default: '0.00' |
| item\_discount\_amount\_# | Discount amount which can have been applied by the merchant on the sale of the specific item. Amount should not be included in 'total\_amount\_#'. |
| item\_discount\_rate\_# | Discount rate for the line item. 1% = 1.00.<br>Default: '0.00' |
| item\_tax\_type\_# | Type of value-added taxes that are being used. |
| item\_alternate\_tax\_id\_# | Tax identification number of the merchant that reported the alternate tax amount. |

|     |     |
| --- | --- |
| \* | Always required |

## Update Invoice

| Variable Name | Description |
| --- | --- |
| invoicing\* | Update an existing invoice.<br>Values: 'update\_invoice' |
| security\_key\* | API Security Key assigned to a merchant account.<br> New keys can be generated from the merchant control panel in Settings > Security Keys |
| invoice\_id\* | The invoice ID to be updated. |

|     |     |
| --- | --- |
| \* | Always required |

#### Notes:

All variables (besides currency) on an invoice may be updated. Updating an invoice will not result in a new invoice being sent to the customer. To send the invoice after updating an invoice, use the send\_invoice request after making changes.

## Send Invoice

| Variable Name | Description |
| --- | --- |
| invoicing\* | Send an existing invoice to a customer.<br> Values: 'send\_invoice' |
| security\_key\* | API Security Key assigned to a merchant account.<br> New keys can be generated from the merchant control panel in Settings > Security Keys |
| invoice\_id\* | The invoice ID to be emailed. |

|     |     |
| --- | --- |
| \* | Always required |

#### Notes:

The invoice will be sent to the billing email address assigned to the invoice.

## Close Invoice

| Variable Name | Description |
| --- | --- |
| invoicing\* | The invoice to be closed.<br> Values: 'close\_invoice' |
| security\_key\* | API Security Key assigned to a merchant account.<br> New keys can be generated from the merchant control panel in Settings > Security Keys |
| invoice\_id\* | The invoice ID to be closed. |

|     |     |
| --- | --- |
| \* | Always required |

# Retail Data  Payment API

## Passing Unencrypted Retail Magnetic Stripe Data

| Variable Name | Description |
| --- | --- |
| track\_1 | Raw Magnetic Stripe Data |
| track\_2 | Raw Magnetic Stripe Data |
| track\_3 | Raw Magnetic Stripe Data |

## Passing MagTek Magensa Encrypted Magnetic Stripe Data

| Variable Name | Description |
| --- | --- |
| magnesafe\_track\_1 | Raw MagTek Magensa Data |
| magnesafe\_track\_2 | Raw MagTek Magensa Data |
| magnesafe\_magneprint | Raw MagTek Magensa Data |
| magnesafe\_ksn | Raw MagTek Magensa Data |
| magnesafe\_magneprint\_status | Raw MagTek Magensa Data |

## Passing IDTech M130 Encrypted Swipe Data

| Variable Name | Description |
| --- | --- |
| encrypted\_track\_1 | Raw encrypted data |
| encrypted\_track\_2 | Raw encrypted data |
| encrypted\_track\_3 | Raw encrypted data |
| encrypted\_ksn | Raw encrypted data |

## Passing IDTech M130 Encrypted Keyed Data

| Variable Name | Description |
| --- | --- |
| encrypted\_data | Raw encrypted data |

## Passing Ingenico Telium 2 Chip Card Data

| Variable Name | Description |
| --- | --- |
| entry\_mode | The type of transaction data to be processed.<br>Value: 'emv\_icc' |
| emv\_auth\_request\_data | EMV Data for the transaction as received from the EMV Chip Card SDK. |
| emv\_device | The EMV - capable card reader.<br>Value: 'ingenico\_rba' |
| verification\_method | Method used to verify the EMV transaction.<br>Values: 'signature', 'offline\_pin', 'offline\_pin\_signature', or 'none' |
| encrypted\_ksn | Raw encrypted data |
| encrypted\_track\_2 | Raw encrypted data |

## Passing Ingenico Telium 2 Swipe Data

| Variable Name | Description |
| --- | --- |
| entry\_mode | The type of transaction data to be processed.<br>Values: 'swiped' or 'swiped\_emv\_fallback' |
| emv\_device | The EMV - capable card reader.<br>Value: 'ingenico\_rba' |
| encrypted\_ksn | Raw encrypted data |
| encrypted\_track\_1 | Raw encrypted data |
| encrypted\_track\_2 | Raw encrypted data |

## Passing Ingenico Telium 2 NFC Data

| Variable Name | Description |
| --- | --- |
| entry\_mode | The type of transaction data to be processed.<br>Value: 'nfc\_msd' |
| emv\_device | The EMV - capable card reader.<br>Value: 'ingenico\_rba' |
| encrypted\_ksn | Raw encrypted data |
| encrypted\_track\_2 | Raw encrypted data |

## Passing Ingenico Telium 2 Keyed Data

| Variable Name | Description |
| --- | --- |
| entry\_mode | The type of transaction data to be processed.<br>Value: 'keyed' |
| emv\_device | The EMV - capable card reader.<br>Value: 'ingenico\_rba' |
| encrypted\_ksn | Raw encrypted data |
| encrypted\_track\_2 | Raw encrypted data |

# Apple Pay  Payment API

This documentation is intended for Apple Pay in **iOS apps**. For information about using Apple Pay on the web see [Apple Pay with Collect.js](https://secure.easypaydirectgateway.com/merchants/resources/integration/integration_portal.php?tid=0ad10c2cc375855565ac2c3d7826f4b5&rand=47180#cjs_applePay)

## Supported Processors

Apple Pay supports Global Payments East - EMV, Test CC Processor, First Data Nashville, Chase Paymentech Salem, Chase Paymentech Tampa, EPX, Vantiv Now Worldpay eCommerce - Host Capture (Litle & Co), Global Payments Canada, First Data Nashville North, Vantiv Now Worldpay Core - Terminal Capture, Paymentech Salem Dev, Vantiv Now Worldpay eCommerce - Terminal Capture (Litle & Co.), First Data Nashville North V2, FACe - Vantiv Pre-Live, FACe - Vantiv, First Data Compass, TSYS - EMV, Credomatic Web Service, Credomatic Web Service Dev, First Data Rapid Connect Nashville North - EMV, First Data Rapid Connect Cardnet North - EMV, First Data Rapid Connect Nashville - EMV, FACe - Vantiv (Next Day Funding), Elavon viaConex, First Data Rapid Connect Omaha - EMV, Elavon EISOP UK/EU - EMV, American Express Direct UK/EU - EMV, Credorax ePower EU - EMV, Worldpay APACS UK/EU - EMV, First Data APACS UK/EU - EMV, Lloyds Cardnet APACS UK/EU - EMV, Barclaycard HISO UK/EU - EMV, AIBMS APACS UK/EU - EMV, Global Payments APACS UK/EU - EMV, Checkout.com Unified Payments, NMI Payments and FACe - Worldpay Core processors configured for e-commerce.


## Configuring Apple Pay

**Creating an Apple Merchant ID**

First, you must obtain an Apple Merchant ID before you can generate the Certificate Signing Request that Apple requires. You will need to set up an Apple Merchant ID in your iOS Developer Account. Follow these steps to complete the setup:

1. Go to Apple's Developer Portal and log in to the Member Center to create a new Merchant ID.
2. Navigate to the Certificates, Identifiers, and Profiles area of the Member Center, and then begin the Register Merchant ID process.
3. You must then set the Apple Merchant ID within your gateway Control Panel under Settings -> Apple Pay.

**Generating the Certificate Signing Request**

Next, you will need to associate a Certificate with the Merchant ID in Apple's Developer Portal. After downloading the Certificate Signing Request from the gateway's options page, follow these steps.

1. In Apple's Developer Portal, click on the Merchant ID and then click "Edit".
2. Click "Create Certificate".
3. You are obtaining a CSR file from a Payment Provider so you will not have to create one. Click "Continue" to proceed to the upload page.
4. Click "Choose File..." and select the Gateway.certSigningRequest file you downloaded from the gateway's options page.

## How to Obtain Apple Pay Payment Data

[PassKit](https://developer.apple.com/library/ios/documentation/UserExperience/Reference/PassKit_Framework/index.html) provides the payment data in the _(PKPayment \*)payment_ that is returned to your app's _paymentAuthorizationViewController:didAuthorizePayment:completion_ method. The Apple Pay encrypted payment data is found in _payment.token.paymentData_.

payment.token.paymentData is a binary (NSData) object, so you must encode it as a hexadecimal string before it can be passed to the Gateway.

## Passing Apple Pay Payment Data

To submit a payment with Apple Pay, send the encrypted token data into the applepay\_payment\_data variable. There is no need to decrypt the data in your app. Only the Gateway will have access to the private key that can decrypt the token.

Apple Pay data can also be stored in the Customer Vault or used to prepare a recurring subscription.


## Notes

When passing in applepay\_payment\_data, you should not include the variables ccnumber or ccexp; they are extracted from the token data.

**Important Note**: The authorization amount must match the amount the customer approves in the app. If you pass in a currency, that must also match the currency approved in the app. If omitted, the currency from the app is used.

For working example code, including how to obtain the PKPayment object and how to pass a simple transaction to the Gateway, [download the sample project](https://secure.easypaydirectgateway.com/gw/merchants/resources/integration/download.php?document=applepayexample).

**Stored Credential and Recurring Note**: When Apple Pay data is added to the Customer Vault or used to create a subscription, an immediate transaction is triggered. This transaction is necessary because Apple Pay data includes a time-sensitive cryptogram, which may expire before the next transaction is ready otherwise. The transaction defaults to a sale in the amount the customer approved on their device, or a $0 authorization if that amount was $0. You can switch the transaction to be authorization-only instead by setting the "type" variable to "auth".

Apple Pay for recurring and Customer Vault requires use of a compatible processor. Please check with support for the latest list of supported platforms.


## Variables

| Variable Name | Description |
| --- | --- |
| applepay\_payment\_data | The encrypted Apple Pay payment data (payment.token.paymentData) from PassKit encoded as a hexadecimal string |

## Troubleshooting

If you receive the error "Failed to decrypt Apple Pay data. Ensure that the Apple Pay Merchant ID is correct in the Gateway Settings and that the certificate was generated from a Gateway Certificate Signing Request.", try these steps:

1. Verify that the Merchant ID that Apple has in the developer portal exactly matches the Merchant ID in the Gateway's settings.
2. Verify that your app's PKPaymentRequest's merchantIdentifier exactly matches the Merchant ID in the Gateway's settings.
3. Ensure that the correct Merchant ID is checked in the Apple Pay section of the Capabilities tab in your project's target settings.
4. Try creating a new Merchant ID. Reusing an existing Merchant ID with a new certificate may sometimes cause issues with encryption.

## Merchant-Decrypted Data

Merchants who already have a certificate registered with Apple and decrypt the data themselves can relay it through repurposed 3-D Secure fields:

| Variable Name | Description |
| --- | --- |
| decrypted\_applepay\_data | Set to "1" to indicate decrypted data is being sent. |
| ccnumber | The dPAN number from the Apple Pay token. |
| ccexp | Expiration date associated with the dPAN. |
| cavv | The cryptogram extracted from the Apple Pay token. |
| eci | The eCommerce Indicator value from the Apple Pay token, when available. |

# Google Pay

This documentation is intended for Google Pay in **Android apps**. For information about using Google Pay on the web see [Google Pay with Collect.js](https://secure.easypaydirectgateway.com/merchants/resources/integration/integration_portal.php?tid=0ad10c2cc375855565ac2c3d7826f4b5&rand=585#cjs_googlePay)

Google Pay allows your customers to submit payment data via a payment method they trust. This also enables you to collect their payment information in a tokenized form so that the plain text credit card information never touches your environment. You can use the data to transact directly, store it in the Customer Vault for future transactions, or create subscriptions.

## Set Up

[Google Pay documentation can be found here.](https://developers.google.com/pay/api/android/overview)
Those documents are maintained by Google and will be kept up to date with any changes and enhancements to the Google Pay SDK.

When setting up your merchant account in the [Google Pay Business Console](https://pay.google.com/business/console/), Google will ask if you are doing a "Direct" or "Gateway" integration; you should select "Gateway." The SDK will ask you to provide "gateway" and "gatewayMerchantId" values.

|     |     |
| --- | --- |
| gateway | "gatewayservices" |
| gatewayMerchantId | Your "Gateway ID" as listed in the Account Information settings page of the merchant portal. |

## Overview

While Google's documentation will have specific details for using the Google Pay SDK, this is an overview of what the integration process and user flow should look like.

1. Your application will render the Google Pay button using libraries provided by Google Mobile Services
2. If the customer taps on the Google Pay button, the Google Pay SDK will open an interface for the customer to select their payment information.
3. The user confirms their payment information, which closes the interface and returns the user to your app.
4. Your app will receive a tokenized version of the customer’s payment information from the Google Pay SDK.
5. That tokenized payload should be passed to the gateway for decryption as a part of your Payment API request.

| Variable Name | Description |
| --- | --- |
| googlepay\_payment\_data | The encrypted token created by the Google Pay SDK. |
| Example Input |
| {"signature":"MEYCIQCkKULRjzfFR/WlREB8ZoFRFCpkhWBHqQy+LIHvICls0QIhAOi09iSGudeQslZCQ8qM26rzIZ1BJvfr1T+wXnhF/85S","protocolVersion":"ECv1","signedMessage":"{\\"encryptedMessage\\":\\"uUh4kCxpIGivV4U3nXb5uxfFXy7GxYNHkdj2KZCtMridD2TKzdhSblIUrDuQuo4jxsqA4kQDMBBkVKA8yYrdD5/3pQnaQubXLBBVGlOS40uhc2YSTHnTFAbVVk5IyM1FVQocBMXpIDhFgtFwo4TYlT1x8HjNzscOF/A1o6WXkslRhbfX/z9EyaIWpz2jeghM4fM4Exd8Re3b6ZPsjrkF5PQSE2opEqppvkaoah7qRdfg0YeaAjbFpsTJ+D0GTEWirlI/T+cqBJT86iL6L6RZkEYkVX5IF3pmgWLqYFUY4g9Oe4rWrRqT9/0sRFcBe7ClR1ojYIZCuz50ISpBG5bCMfo/jFX2br32JEo1Qz/xEZrzNG05gbalQx6daNYiW7kcqcMwD6PDcxrHPe1nNV88ByY5zjC6wIwuP0kDdvMEHSb8qrpoBI/K0u6ICuo\\\u003d\\",\\"ephemeralPublicKey\\":\\"BFC+ibo/f3HUmz8t3OBPuOUF17WOb3/aUgw4iAQFlPU2ovLtJijwJ68lHbhXsoKt3NKCVS5qRqcSzM0uyDCr0fY\\\u003d\\",\\"tag\\":\\"1R4JBFAxVfw9PNTgI5FXEWFXbSXEdPWIEYkqg/AnyQk\\\u003d\\"}"} |

In the event that there is data in the Payment API request and the Google Pay token, such as the customer's zip code, the gateway will prefer the value in the Google Pay token, as that is what the customer explicitly provided.

**Stored Credential and Recurring Note**: When Google Pay data is submitted to the Customer Vault or used to create a subscription, a zero-dollar authorization is immediately triggered. This ensures that any time-sensitive cryptogram data is used before it expires, and that the account information is properly configured for subsequent card-on-file transactions. You can customize this transaction, performing a sale or authorization instead, by specifying a "amount" and "type" variables.

Google Pay for recurring and Customer Vault requires use of a compatible processor. Support has the latest list of compatible platforms.

## Merchant-Decrypted Data

Merchants who use a "Direct" Google Pay integration and decrypt the data themselves can relay it through repurposed 3-D Secure fields:

| Variable Name | Description |
| --- | --- |
| decrypted\_googlepay\_data | Set to "1" to indicate decrypted data is being sent. |
| ccnumber | The dPAN number from the Google Pay token. |
| ccexp | Expiration date associated with the dPAN. |
| cavv | The cryptogram extracted from the Google Pay token. |
| eci | The eCommerce Indicator value from the Google Pay token, when available. |

# Recurring Variables  Payment API

## POST URL

|     |     |
| --- | --- |
| POST URL: | https://secure.easypaydirectgateway.com/api/transact.php |

## Add a Plan

| Variable Name | Description |
| --- | --- |
| recurring\* | Add a recurring plan that subscriptions can be added to in the future.<br>Value: 'add\_plan' |
| plan\_payments\* | The number of payments before the recurring plan is complete.<br>Notes: '0' for until canceled |
| plan\_amount\* | The plan amount to be charged each billing cycle.<br>Format: x.xx |
| plan\_name\* | The display name of the plan. |
| plan\_id\* | The unique plan ID that references only this recurring plan. |
| day\_frequency\*\* | How often, in days, to charge the customer. Cannot be set with 'month\_frequency' or 'day\_of\_month'. |
| month\_frequency\\*\\*\\* | How often, in months, to charge the customer. Cannot be set with 'day\_frequency'. Must be set with 'day\_of\_month'.<br>Values: 1 through 24 |
| day\_of\_month\\*\\*\\* | The day that the customer will be charged. Cannot be set with 'day\_frequency'. Must be set with 'month\_frequency'.<br>Values: 1 through 31 - for months without 29, 30, or 31 days, the charge will be on the last day |

|     |     |
| --- | --- |
| \* | Always required |
| \*\* | Required unless 'month\_frequency' and 'day\_of\_month' is set. |
| \\*\\*\\* | Required unless 'day\_frequency' is set. |

## Edit a Plan

| Variable Name | Description |
| --- | --- |
| recurring\* | Edit an existing recurring plan.<br>Value: 'edit\_plan' - Be careful when editing an existing plan, as all customers signed up for this plan will have their billing changed based on your edits. |
| current\_plan\_id\* | Only relevant for editing an existing plan, the value will be the 'plan\_id' that will be edited in this request. |
| plan\_payments | The number of payments before the recurring plan is complete.<br>Notes: '0' for until canceled |
| plan\_amount | The plan amount to be charged each billing cycle.<br>Format: x.xx |
| plan\_name | The display name of the plan. |
| plan\_id | The unique plan ID that references only this recurring plan. |
| day\_frequency\*\* | How often, in days, to charge the customer. Cannot be set with 'month\_frequency' or 'day\_of\_month'. |
| month\_frequency\\*\\*\\* | How often, in months, to charge the customer. Cannot be set with 'day\_frequency'. Must be set with 'day\_of\_month'.<br>Values: 1 through 24 |
| day\_of\_month\\*\\*\\* | The day that the customer will be charged. Cannot be set with 'day\_frequency'. Must be set with 'month\_frequency'.<br>Values: 1 through 31 - for months without 29, 30, or 31 days, the charge will be on the last day |

|     |     |
| --- | --- |
| \* | Always required |
| \*\* | Required unless 'month\_frequency' and 'day\_of\_month' is set. |
| \\*\\*\\* | Required unless 'day\_frequency' is set. |

## Add a Subscription to an Existing Plan

| Variable Name | Description |
| --- | --- |
| recurring\* | Associate payment information with a recurring plan.<br>Value: add\_subscription |
| plan\_id\* | The plan ID of the plan that the subscription will be associated with. |
| start\_date | The first day that the customer will be charged.<br>Format: YYYYMMDD |
| payment\_token | The tokenized version of the customer's card or check information. This will be generated by [Collect.js](https://secure.easypaydirectgateway.com/merchants/resources/integration/integration_portal.php#cjs_methodology) and is usable only once. |
| googlepay\_payment\_data | The encrypted token created when using [integration directly to the Google Pay SDK](https://secure.easypaydirectgateway.com/merchants/resources/integration/integration_portal.php#googlepay_variables). |
| applepay\_payment\_data | The encrypted token created when using [integration directly to the Apple Pay SDK](https://secure.easypaydirectgateway.com/merchants/resources/integration/integration_portal.php#applepay_variables). |
| ccnumber\*\* | Credit card number. |
| ccexp\*\* | Credit card expiration.<br>Format: MMYY |
| cavv† | Cryptogram from decrypted Apple Pay or Google Pay data<br>Format: base64 encoded |
| decrypted\_applepay\_data† | Indicator that the ccnumber, ccexp, and cavv fields contain decrypted Apple Pay data<br>Value: 1 |
| decrypted\_googlepay\_data† | Indicator that the ccnumber, ccexp, and cavv fields contain decrypted Google Pay data<br>Value: 1 |
| payment\\*\\*\\* | The type of payment.<br>Default: 'creditcard'<br>Values: 'creditcard' or 'check' |
| checkname\\*\\*\\* | The name on the customer's ACH account. |
| checkaccount\\*\\*\\* | The customer's bank account number. |
| checkaba\\*\\*\\* | The customer's bank routing number. |
| account\_type | The customer's ACH account type.<br>Values: 'checking' or 'savings' |
| currency | Set transaction currency. |
| account\_holder\_type | The customer's ACH account entity.<br>Values: 'personal' or 'business' |
| sec\_code | ACH standard entry class codes.<br>Values: 'PPD', 'WEB', 'TEL', or 'CCD' |
| first\_name | Cardholder's first name.<br>Legacy variable includes: firstname |
| last\_name | Cardholder's last name.<br>Legacy variable includes: lastname |
| address1 | Card billing address. |
| city | Card billing city |
| state | Card billing state. |
| zip | Card billing postal code. |
| country | Card billing country code. |
| phone | Billing phone number. |
| email | Billing email address. |
| company | Cardholder's company. |
| address2 | Card billing address, line 2. |
| fax | Billing fax number. |
| orderid | Order ID |
| order\_date | Order Date |
| order\_description | Order Description |
| merchant\_defined\_field\_# | Can be set up in merchant control panel under 'Settings'->'Merchant Defined Fields'. |
| ponumber | Cardholder's purchase order number. |
| processor\_id | If using Multiple MIDs, route to this processor (processor\_id is obtained under Settings->Transaction Routing in the Control Panel). |
| customer\_receipt | If set to true, when the customer is charged, they will be sent a transaction receipt.<br>Values: 'true' or 'false' |
| source\_transaction\_id | Specifies a payment gateway transaction id in order to associate payment information with a Subscription record. |
| acu\_enabled | If set to true, credit card will be evaluated and sent based upon Automatic Card Updater settings. If set to false, credit card will not be submitted for updates when Automatic Card Updater runs.<br>Default: 'true'<br>Values: 'true' or 'false' |

|     |     |
| --- | --- |
| \* | Always required |
| \*\* | Required for credit card transactions |
| \\*\\*\\* | Required for ACH transactions |
| † | Required for Digital Wallet transactions with merchant-decrypted data |

## Adding a Custom Subscription

| Variable Name | Description |
| --- | --- |
| recurring\* | Add a custom recurring subscription that is NOT associated with an existing plan<br>Value: 'add\_subscription' |
| plan\_payments\* | The number of payments before the recurring plan is complete.<br>Notes: '0' for until canceled |
| plan\_amount\* | The plan amount to be charged each billing cycle.<br>Format: x.xx |
| day\_frequency\*\* | How often, in days, to charge the customer. Cannot be set with 'month\_frequency' or 'day\_of\_month'. |
| month\_frequency\\*\\*\\* | How often, in months, to charge the customer. Cannot be set with 'day\_frequency'. Must be set with 'day\_of\_month'.<br>Values: 1 through 24 |
| day\_of\_month\\*\\*\\* | The day that the customer will be charged. Cannot be set with 'day\_frequency'. Must be set with 'month\_frequency'.<br>Values: 1 through 31 - for months without 29, 30, or 31 days, the charge will be on the last day |
| start\_date | The first day that the customer will be charged.<br>Format: YYYYMMDD |
| payment\_token | The tokenized version of the customer's card or check information. This will be generated by [Collect.js](https://secure.easypaydirectgateway.com/merchants/resources/integration/integration_portal.php#cjs_methodology) and is usable only once. |
| googlepay\_payment\_data | The encrypted token created when using [integration directly to the Google Pay SDK](https://secure.easypaydirectgateway.com/merchants/resources/integration/integration_portal.php#googlepay_variables). |
| applepay\_payment\_data | The encrypted token created when using [integration directly to the Apple Pay SDK](https://secure.easypaydirectgateway.com/merchants/resources/integration/integration_portal.php#applepay_variables). |
| ccnumber\\*\\*\\*\* | Credit card number. |
| ccexp\\*\\*\\*\* | Credit card expiration.<br>Format: MMYY |
| cavv†† | Cryptogram from decrypted Apple Pay or Google Pay data<br>Format: base64 encoded |
| decrypted\_applepay\_data†† | Indicator that the ccnumber, ccexp, and cavv fields contain decrypted Apple Pay data<br>Value: 1 |
| decrypted\_googlepay\_data†† | Indicator that the ccnumber, ccexp, and cavv fields contain decrypted Google Pay data<br>Value: 1 |
| payment† | The type of payment.<br>Default: 'creditcard'<br>Values: 'creditcard' or 'check' |
| checkname† | The name on the customer's ACH account. |
| checkaccount† | The customer's bank account number. |
| checkaba† | The customer's bank routing number. |
| account\_type | The customer's ACH account type.<br>Values: 'checking' or 'savings' |
| account\_holder\_type | The customer's ACH account entity.<br>Values: 'personal' or 'business' |
| sec\_code | ACH standard entry class codes.<br>Values: 'PPD', 'WEB', 'TEL', or 'CCD' |
| first\_name | Cardholder's first name.<br>Legacy variable includes: firstname |
| last\_name | Cardholder's last name.<br>Legacy variable includes: lastname |
| address1 | Card billing address. |
| city | Card billing city |
| state | Card billing state. |
| zip | Card billing postal code. |
| country | Card billing country code. |
| phone | Billing phone number. |
| email | Billing email address. |
| company | Cardholder's company. |
| address2 | Card billing address, line 2. |
| fax | Billing fax number. |
| orderid | Order ID |
| order\_date | Order Date |
| order\_description | Order Description<br>Legacy variable includes: orderdescription |
| merchant\_defined\_field\_# | Can be set up in merchant control panel under 'Settings'->'Merchant Defined Fields'. |
| ponumber | Cardholder's purchase order number. |
| processor\_id | If using Multiple MIDs, route to this processor (processor\_id is obtained under Settings->Transaction Routing in the Control Panel). |
| customer\_receipt | If set to true, when the customer is charged, they will be sent a transaction receipt.<br>Values: 'true' or 'false' |
| source\_transaction\_id | Specifies a payment gateway transaction id in order to associate payment information with a Subscription record. |
| acu\_enabled | If set to true, credit card will be evaluated and sent based upon Automatic Card Updater settings. If set to false, credit card will not be submitted for updates when Automatic Card Updater runs.<br>Default: 'true'<br>Values: 'true' or 'false' |
| paused\_subscription | If set to true, the subscription will be paused.<br>Values: 'true' or 'false' |

|     |     |
| --- | --- |
| \* | Always required |
| \*\* | Required unless 'month\_frequency' and 'day\_of\_month' is set. |
| \\*\\*\\* | Required unless 'day\_frequency' is set. |
| \\*\\*\\*\* | Required for credit card transactions |
| † | Required for ACH transactions |
| †† | Required for Digital Wallet transactions with merchant-decrypted data |

## Update a Custom Subscription's Plan Details

| Variable Name | Description |
| --- | --- |
| recurring\* | Update the subscription's billing information.<br>Value: 'update\_subscription' |
| subscription\_id\* | The subscription ID that will be updated. |
| plan\_payments | The number of payments before the recurring plan is complete.<br>Notes: '0' for until canceled |
| plan\_amount | The plan amount to be charged each billing cycle.<br>Format: x.xx |
| day\_frequency | How often, in days, to charge the customer. Cannot be set with 'month\_frequency' or 'day\_of\_month'. |
| month\_frequency | How often, in months, to charge the customer. Cannot be set with 'day\_frequency'. Must be set with 'day\_of\_month'.<br>Values: 1 through 24 |
| day\_of\_month | The day that the customer will be charged. Cannot be set with 'day\_frequency'. Must be set with 'month\_frequency'.<br>Values: 1 through 31 - for months without 29, 30, or 31 days, the charge will be on the last day |

|     |     |
| --- | --- |
| \* | Always required |

## Update Subscription

| Variable Name | Description |
| --- | --- |
| recurring\* | Update the subscription's billing information.<br>Value: 'update\_subscription' |
| subscription\_id\* | The subscription ID that will be updated. |
| plan\_payments | The number of payments before the recurring plan is complete.<br>Notes: '0' for until canceled |
| plan\_amount | The plan amount to be charged each billing cycle.<br>Format: x.xx |
| day\_frequency | How often, in days, to charge the customer. Cannot be set with 'month\_frequency' or 'day\_of\_month'. |
| month\_frequency | How often, in months, to charge the customer. Cannot be set with 'day\_frequency'. Must be set with 'day\_of\_month'.<br>Values: 1 through 24 |
| day\_of\_month | The day that the customer will be charged. Cannot be set with 'day\_frequency'. Must be set with 'month\_frequency'.<br>Values: 1 through 31 - for months without 29, 30, or 31 days, the charge will be on the last day |
| start\_date | The first day that the customer will be charged.<br>Format: YYYYMMDD |
| payment\_token | The tokenized version of the customer's card or check information. This will be generated by [Collect.js](https://secure.easypaydirectgateway.com/merchants/resources/integration/integration_portal.php#cjs_methodology) and is usable only once. |
| googlepay\_payment\_data | The encrypted token created when [integration directly to the Google Pay SDK](https://secure.easypaydirectgateway.com/merchants/resources/integration/integration_portal.php#googlepay_variables). |
| ccnumber | Credit card number. |
| ccexp | Credit card expiration.<br>Format: MMYY |
| checkname | The name on the customer's ACH account. |
| checkaccount | The customer's bank account number. |
| checkaba | The customer's bank routing number. |
| account\_type | The customer's ACH account type.<br>Values: 'checking' or 'savings' |
| account\_holder\_type | The customer's ACH account entity.<br>Values: 'personal' or 'business' |
| sec\_code | ACH standard entry class codes.<br>Values: 'PPD', 'WEB', 'TEL', or 'CCD' |
| first\_name | Cardholder's first name.<br>Legacy variable includes: firstname |
| last\_name | Cardholder's last name.<br>Legacy variable includes: lastname |
| address1 | Card billing address. |
| city | Card billing city |
| state | Card billing state. |
| zip | Card billing postal code. |
| country | Card billing country code. |
| phone | Billing phone number. |
| email | Billing email address. |
| company | Cardholder's company. |
| address2 | Card billing address, line 2. |
| fax | Billing fax number. |
| orderid | Order ID |
| order\_date | Order Date |
| order\_description | Order Description<br>Legacy variable includes: orderdescription |
| merchant\_defined\_field\_# | Can be set up in merchant control panel under 'Settings'->'Merchant Defined Fields'. |
| ponumber | Cardholder's purchase order number. |
| processor\_id | If using Multiple MIDs, route to this processor (processor\_id is obtained under Settings->Transaction Routing in the Control Panel). |
| customer\_receipt | If set to true, when the customer is charged, they will be sent a transaction receipt.<br>Values: 'true' or 'false' |
| source\_transaction\_id | Specifies a payment gateway transaction id in order to associate payment information with a Subscription record. |
| acu\_enabled | If set to true, credit card will be evaluated and sent based upon Automatic Card Updater settings. If set to false, credit card will not be submitted for updates when Automatic Card Updater runs.<br>Default: 'true'<br>Values: 'true' or 'false' |
| paused\_subscription | If set to true, the subscription will be paused.<br>Values: 'true' or 'false' |

|     |     |
| --- | --- |
| \* | Always required |

## Delete a Subscription

| Variable Name | Description |
| --- | --- |
| recurring\* | Delete the subscription. Customer will no longer be charged.<br>Value: 'delete\_subscription' |
| subscription\_id\* | The subscription ID that will be deleted. |

|     |     |
| --- | --- |
| \* | Always required |

# Customer Vault Variables  Payment API

## POST URL

|     |     |
| --- | --- |
| POST URL: | https://secure.easypaydirectgateway.com/api/transact.php |

## Add/Update Customer Record

| Variables | Description |
| --- | --- |
| customer\_vault\* | Add/Update a secure Customer Vault record.<br>Values: 'add\_customer' or 'update\_customer' |
| customer\_vault\_id | Specifies a Customer Vault id. If not set, the payment gateway will randomly generate a Customer Vault id. |
| billing\_id | Billing id to be assigned or updated. If none is provided, one will be created or the billing id with priority '1' will be updated. |
| security\_key\* | API Security Key assigned to a merchant account.<br> New keys can be generated from the merchant control panel in Settings > Security Keys |
| payment\_token | The tokenized version of the customer's card or check information. This will be generated by [Collect.js](https://secure.easypaydirectgateway.com/merchants/resources/integration/integration_portal.php#cjs_methodology) and is usable only once. |
| applepay\_payment\_data | The encrypted token created by an [integration directly to the Apple Pay SDK](https://secure.easypaydirectgateway.com/merchants/resources/integration/integration_portal.php#applepay_variables). |
| googlepay\_payment\_data | The encrypted token created by an [integration directly to the Google Pay SDK](https://secure.easypaydirectgateway.com/merchants/resources/integration/integration_portal.php#googlepay_variables). |
| ccnumber\*\* | Credit card number. |
| ccexp\*\* | Credit card expiration.<br>Format: MMYY |
| cavv† | Cryptogram in decrypted Apple Pay or Google Pay data.<br>Format: Base64 encoded |
| decrypted\_applepay\_data† | Flag to indicate ccnumber, ccexp, and cavv were extracted from Apple Pay data<br>Value: 1 |
| decrypted\_googlepay\_data† | Flag to indicate ccnumber, ccexp, and cavv were extracted from Google Pay data<br>Value: 1 |
| checkname\\*\\*\\* | The name on the customer's ACH account. |
| checkaba\\*\\*\\* | The customer's bank routing number. |
| checkaccount\\*\\*\\* | The customer's bank account number. |
| account\_holder\_type | The customer's ACH account entity.<br>Values: 'personal' or 'business' |
| account\_type | The customer's ACH account type.<br>Values: 'checking' or 'savings' |
| sec\_code | ACH standard entry class codes.<br>Values: 'PPD', 'WEB', 'TEL', or 'CCD' |
| currency | Set transaction currency. |
| payment | Set payment type to ACH or credit card.<br>Values: 'creditcard' or 'check' |
| orderid | Order id |
| order\_description | Order Description<br>Legacy variable includes: orderdescription |
| merchant\_defined\_field\_# | Can be set up in merchant control panel under 'Settings'->'Merchant Defined Fields'.<br>Format: merchant\_defined\_field\_1=Value |
| first\_name | Cardholder's first name.<br>Legacy variable includes: firstname |
| last\_name | Cardholder's last name.<br>Legacy variable includes: lastname |
| address1 | Card billing address. |
| city | Card billing city |
| state | Card billing state. |
| zip | Card billing postal code. |
| country | Card billing country code. |
| phone | Billing phone number. |
| email | Billing email address. |
| company | Cardholder's company. |
| address2 | Card billing address, line 2. |
| fax | Billing fax number. |
| shipping\_id | Shipping entry id. If none is provided, one will be created or the billing id with priority '1' will be updated. |
| shipping\_firstname | Shipping first name. |
| shipping\_lastname | Shipping last name. |
| shipping\_company | Shipping company. |
| shipping\_address1 | Shipping address. |
| shipping\_address2 | Shipping address, line 2. |
| shipping\_city | Shipping city |
| shipping\_state | Shipping state. |
| shipping\_zip | Shipping postal code. |
| shipping\_country | Shipping country code. |
| shipping\_phone | Shipping phone number. |
| shipping\_fax | Shipping fax number. |
| shipping\_email | Shipping email address. |
| source\_transaction\_id | Specifies a payment gateway transaction id in order to associate payment information with a Customer Vault record. |
| acu\_enabled | If set to true, credit card will be evaluated and sent based upon Automatic Card Updater settings. If set to false, credit card will not be submitted for updates when Automatic Card Updater runs.<br>Default: 'true'<br>Values: 'true' or 'false' |

|     |     |
| --- | --- |
| \* | Always required |
| \*\* | Required for credit card transactions |
| \\*\\*\\* | Required for ACH transactions |
| † | Required for Merchant-Decrypted Apple Pay or Google Pay data |

## Customer Vault initiated Sale/Auth/Credit/Offline

| Variable | Description |
| --- | --- |
| security\_key\* | API Security Key assigned to a merchant account.<br> New keys can be generated from the merchant control panel in Settings > Security Keys |
| customer\_vault\_id\* | Specifies a Customer Vault id. |
| amount | Total amount to be charged. For validate, the amount must be omitted or set to 0.00.<br>Format: x.xx |
| currency | The transaction currency.<br> Format: ISO 4217 |
| processor\_id | If using Multiple MIDs, route to this processor (processor\_id is obtained under Settings->Transaction Routing in the Control Panel). |
| descriptor | Set payment descriptor on supported processors. |
| descriptor\_phone | Set payment descriptor phone on supported processors. |
| order\_description | Order description.<br>Legacy variable includes: orderdescription |
| orderid | Order ID |
| Stored Credentials (CIT/MIT) |
| initiated\_by | Who initiated the transaction.<br>Values: 'customer' or 'merchant' |
| initial\_transaction\_id | Original payment gateway transaction id. |
| stored\_credential\_indicator | The indicator of the stored credential.<br>Values: 'stored' or 'used'<br>Use **'stored'** when processing the initial transaction in which you are storing a customer's payment details (customer credentials) in the Customer Vault or other third-party payment storage system.<br>Use **'used'** when processing a subsequent or follow-up transaction using the customer payment details (customer credentials) you have already stored to the Customer Vault or third-party payment storage method. |

|     |     |
| --- | --- |
| \* | Always required |

## Delete Customer Record

| Variable | Description |
| --- | --- |
| customer\_vault\* | Deletes a secure Customer Vault record.<br>Values: 'delete\_customer' |
| customer\_vault\_id\* | Specifies a Customer Vault id. |
| security\_key\* | API Security Key assigned to a merchant account.<br> New keys can be generated from the merchant control panel in Settings > Security Keys |

|     |     |
| --- | --- |
| \* | Always required |

#### Notes:

- If you do not pass a customer\_vault\_id, our system will randomly generate one. If you include a customer\_id and customer\_vault\_id, they must match.
- You can only pass Credit Card or Electronic Check transaction variables.

# Product Manager Variables  Payment API

## POST URL

|     |     |
| --- | --- |
| POST URL: | https://secure.easypaydirectgateway.com/api/transact.php |

## Add a Product

| Variables | Description |
| --- | --- |
| products\* | Add a product to the Product Manager.<br> Value: “add\_product“ |
| product\_sku\* | The unique SKU for this product. An error will be returned if the SKU is already in use by another product.<br> Examples: “000001” or “324-6323-0005“ |
| product\_description\* | The user-facing name of the product.<br> Examples: “1 Gallon Milk” or “Phone Case” |
| product\_cost\* | The cost of the product before any tax or discounts. Must be greater than 0.00. |
| product\_currency\* | The currency for the product’s price.<br> Examples: “USD” or “EUR” |
| product\_commodity\_code | The commodity code for the product. |
| product\_unit\_of\_measure | The unit of measure for the product. Defaults to “NAR” (number of articles).<br> Examples: “TDK” or “MTQ” |
| product\_tax\_amount | The tax that should be added to the product cost. This is a fixed amount, not a percentage.<br> Example: “1.54” |
| product\_discount\_amount | The discount that will subtracted from the cost of the product. |
| product\_image\_data\*\* | The Base64-encoded version of the image for the product. The format must be JPG, PNG, or GIF, and be 2MB or smaller. |
| product\_image\_name\*\* | The file name of the image being added with product\_image\_data.<br> Examples: “product.png” or “sku-1234.jpg” |

|     |     |
| --- | --- |
| \* | Always required |
| \*\* | Required if adding an image to the product |

## Update a Product

| Variables | Description |
| --- | --- |
| products\* | Update a product already in the Product Manager.<br> Value: “update\_product” |
| product\_id\* | The automatically generated ID for the product. This was returned in the add\_product API response, or can be found in the UI under the Product Details page in the Product Manager.<br> Example: “5538585252” |
| product\_sku | The unique SKU for this product. An error will be returned if the SKU is already in use by another product.<br> Examples: “000001” or “324-6323-0005” |
| product\_description | The user-facing name of the product.<br> Examples: “1 Gallon Milk” or “Phone Case” |
| product\_cost | The cost of the product before any tax or discounts. Must be greater than 0.00. |
| product\_currency | The currency for the product’s price.<br> Examples: “USD” or “EUR” |
| product\_commodity\_code | The commodity code for the product. |
| product\_unit\_of\_measure | The unit of measure for the product.<br> Examples: “TDK” or “MTQ” |
| product\_tax\_amount | The tax that should be added to the product cost. This is a fixed amount, not a percentage.<br> Example: “1.54” |
| product\_discount\_amount | The discount that will subtracted from the cost of the product. |
| product\_image\_data\*\* | The Base64-encoded version of the image for the product. The format must be JPG, PNG, or GIF, and be 2MB or smaller. |
| product\_image\_name\*\* | The file name of the image being added with product\_image\_data.<br> Examples: “product.png” or “sku-1234.jpg” |

|     |     |
| --- | --- |
| \* | Always required |
| \*\* | Required if adding an image to the product |

## Delete a Product

| Variables | Description |
| --- | --- |
| products\* | Delete a product to the Product Manager. This action can not be undone.<br> Value: “delete\_product” |
| product\_id\* | The automatically generated ID for the product. This was returned in the add\_product API response, or can be found in the UI under the Product Details page in the Product Manager.<br> Example: “5538585252” |

|     |     |
| --- | --- |
| \* | Always required |

# Partial Payment Information  Payment API

## Request Details

| Variable | Description |
| --- | --- |
| partial\_payment\_id | Unique identifier returned when making the original transaction. This should only be used for secondary transactions. |
| partial\_payments | This variable allows the following two values to be passed to it: |
| settle\_partial: Settles any amount of tender collected (captured partial auth's and approved partial sales) at cut off. |
| payment\_in\_full: Required that any split tendered transaction is collected in-full before settlement gets initiated. |
| type | This variable can be passed the value 'complete\_partial\_payment' which will complete a payment\_in\_full transaction that has not been collected in full. This allows industries that require payment\_in\_full but subsequently decide to still settle the transaction even though it has not been collected in full. |

## Response Details

| Variable | Description |
| --- | --- |
| partial\_payment\_id | A numeric identifier which is used when submitting subsequent transactions. |
| partial\_payment\_balance | Returns the payment's remaining balance. |
| amount\_authorized | Provides the amount that was authorized. |

## Examples

Example 1: In this request, if nothing more was done, a transaction for 30.00 would settle at the next cut-off.

|     |     |
| --- | --- |
| Request | ...type=sale&partial\_payments=settle\_partial&ccnumber=4111111111111111&ccexp=1016&amount=100.00... |
| Response | ...response=1&partial\_payment\_id=123456789&partial\_payment\_balance=70.00&amount\_authorized=30.00... |

Example 2: In this request, payment\_in\_full was required and two transaction were collected - this transaction would settle at the next cut-off.

|     |     |
| --- | --- |
| Request 1 | ...type=sale&partial\_payments=payment\_in\_full&ccnumber=4111111111111111&ccexp=1016&amount=100.00... |
| Response 1 | ...response=1&partial\_payment\_id=123456789&partial\_payment\_balance=70.00&amount\_authorized=30.00... |
| Request 2 | ...type=sale&partial\_payment\_id=123456789&partial\_payments=payment\_in\_full&ccnumber=4000000000000002&ccexp=1016&amount=70.00... |
| Response 2 | ...response=1& partial\_payment\_id=123456789&partial\_payment \_balance=0.00&amount\_authorized=70.00... |

Example 3: In this example, payment\_in\_full was required and two transactions were attempted, but only one collected. The merchant decided to force it out anyways - this transaction would settle at the next cut-off.

|     |     |
| --- | --- |
| Request 1 | ...type=sale&partial\_payments=payment\_in\_full&ccnumber=4111111111111111&ccexp=1016&amount=100.00... |
| Response 1 | ...response=1&partial\_payment\_id=123456789&partial\_payment\_balance=70.00&amount\_authorized=30.00... |
| Request 2 | ...type=sale&partial\_payment\_id=123456789&partial\_payments=payment\_in\_full&ccnumber=4000000000000002&ccexp=1016&amount=70.00... |
| Response 2 | ...response=2&partial\_payment\_id=123456789&partial\_payment\_balance=70.00&amount\_authorized=70.00... |
| Request 3 | ...type=complete\_partial\_payment& partial\_payment\_id=123456789&partial\_payments=payment\_in\_full&amount=70.00... |
| Response 3 | ...response=1& partial\_payment\_id=123456789&partial\_payment\_balance=0.00&amount\_authorized=70.00... |

# Credential on File Information  Payment API

_Please note the below is meant to be a guide for how the platform supports CIT and MIT use cases. This is not meant to be an exhaustive list of items needed in order to be compliant. For more information on CIT/MIT compliance, please consult your processor._

Credential on File regulations apply any time data is stored to process future purchases for a cardholder.

**Customer vs Merchant Initiated**

When a customer is actively engaged in checkout - either physically present in a store, or checking out online in their browser, that is a **Customer Initiated Transaction** (CIT).

When the customer isn’t actively engaged, but has given permission for their card to be charged, that is a **Merchant Initiated Transaction**(MIT). In order for a merchant to submit a Merchant Initiated Transaction, a Customer Initiated transaction is required first.

**Overview**

A cardholder’s consent is required for the initial storage of credentials. When a card is stored, an initial transaction should be submitted (Validate, Sale, or Auth) with the **correct credential-on-file type**. The transaction must be approved (not declined or encounter an error.) Then, store the transaction ID of the initial customer initiated transaction. The transaction ID must then be submitted with any follow up transactions (MIT or CIT.)

Credential on File types include Recurring, Installment, and Unscheduled types.

For simplicity - we are using the Payment API variables. These match the names of the Batch Upload, Collect.js, Browser Redirect, or the Customer-Present Cloud APIs. The Three-Step API follows the same pattern, and the variables should be submitted on Step 1.

## Request Details

| Variable | Description |
| --- | --- |
| initiated\_by | Who initiated the transaction.<br>Values: 'customer' or 'merchant' |
| initial\_transaction\_id | Original payment gateway transaction id. |
| stored\_credential\_indicator | The indicator of the stored credential.<br>Values: 'stored' or 'used'<br>Use **'stored'** when processing the initial transaction in which you are storing a customer's payment details (customer credentials) in the Customer Vault or other third-party payment storage system.<br>Use **'used'** when processing a subsequent or follow-up transaction using the customer payment details (customer credentials) you have already stored to the Customer Vault or third-party payment storage method. |

## Response Details

| Variable | Description |
| --- | --- |
| cof\_supported | Credential on File support indicator specific to the transaction.<br>Values: 'stored' or 'used'<br>Value will be **'stored'** if CIT/MIT transaction was sent to a processor that supports the feature.<br>Value will be **'used'** if CIT/MIT transaction was sent to a processor that does not support the feature or if a merchant-initiated transaction cannot occur due to Cross-Processor limitations. |

**Please Note:** For Three-Step Redirect transactions, the request details must be sent in Step 1 and the ‘cof-supported’ element will be returned in the response of Step 3.

**Referencing the Initial Transaction:**

When doing a credential-on-file type transaction, we will reject any follow up transactions that pass in a card number that does not match the card brand used in the initial transaction. For example, using a Mastercard when the original transaction uses Visa will result in the transaction getting rejected. The card brands each have independent systems for tracking card-on-file transactions, so an initial transaction ID cannot be reused between them. We reject this type of incorrect reuse at the time of the request because it can result in settlement failures, downgrades, etc. later.

If a customer changes their card on file, a good practice is to first store it as a new initial transaction, and reference that initial transaction ID for future payments on the new card.

**Recurring:**

_A transaction in a series of transactions that uses a stored credential and are processed at fixed, regular intervals (not to exceed one year between transactions), and represents cardholder agreement for the merchant to initiate future transactions for the purchase of goods or services provided at regular intervals._

If a customer is signing up for a **recurring** subscription, the merchant is expected to send "an initial recurring transaction" every time the customer signs up for a new recurring subscription.

For an initial transaction:

- For a free trial, the initial transaction will be a validate transaction type (or auth if validate is not supported.)
- If the customer is being charged immediately for a product, the initial transaction will be a sale or an authorization for the correct amount.

Either transaction MUST INCLUDE three items:

- billing\_method=recurring
- initiated\_by=customer
- stored\_credential\_indicator=stored

## Examples

Example 1: In this request, an initial recurring sale is sent and an approved transaction is returned in the response. _Store_ this transaction for the follow up request.

|     |     |
| --- | --- |
| Request | ...type=sale&billing\_method=recurring&initiated\_by=customer&stored\_credential\_indicator=stored... |
| Response | ...response=1&responsetext=Approved&transactionid=1234567890... |

The transaction ID would be stored and submitted on follow up transactions. The follow up transaction(s) would include:

- billing\_method=recurring
- initiated\_by=merchant
- stored\_credential\_indicator=used
- initial\_transaction\_id=XXXXXXXXXX

Example 2: In this request, the subsequent merchant initiated sale is processed using the stored transaction from Example 1.

|     |     |
| --- | --- |
| Request | ...type=sale&billing\_method=recurring&initiated\_by=merchant&stored\_credential\_indicator=used&initial\_transaction\_id=1234567890... |
| Response | ...response=1&responsetext=Approved&transactionid=1234567891... |

**Please Note:** This transaction ID cannot be used for "unscheduled" or "installment" credential-on-file transactions.

**Installment:**

_An “installment” transaction is a series of transactions that uses a stored credential and represents cardholder agreement with the merchant to initiate one or more future transactions over a period of time for a single purchase of goods or services._

Installment transactions work just like Recurring in that you need a customer initiated transaction for a subsequent installment transaction. The difference is the billing\_method will be “installment”.

The customer initiated transaction MUST INCLUDE at least three items (\* recommended to send, if available):

- billing\_method=installment
- initiated\_by=customer
- stored\_credential\_indicator=stored
- \\* billing\_total
- \\* billing\_number (Values: 0-99)

## Examples

Example 3: In this request, an initial installment sale is sent and an approved transaction is returned in the response. Store this transaction for the follow up request.

|     |     |
| --- | --- |
| Request | ...type=sale&billing\_method=installment&initiated\_by=customer&stored\_credential\_indicator=stored&billing\_total=100.00&billing\_number=1&amount=25.00... |
| Response | ...response=1&responsetext=Approved&transactionid=1234567890… |

The transaction ID would be stored and submitted on follow up transactions. The follow up transaction(s) would include (\* recommended to send, if available):

- billing\_method=installment
- initiated\_by=merchant
- stored\_credential\_indicator=used
- initial\_transaction\_id=XXXXXXXXXX
- \\* billing\_total
- \\* billing\_number

Example 4: In this request, the subsequent merchant initiated sale is processed using the stored transaction from Example 3.

|     |     |
| --- | --- |
| Request | ...type=sale&billing\_method=installment&initiated\_by=merchant&stored\_credential\_indicator=used&initial\_transaction\_id=1234567890&billing\_total=100.00&billing\_number=1&amount=25.00... |
| Response | ...response=1&responsetext=Approved&transactionid=1234567891… |

_**Please Note:** This transaction ID cannot be used for "unscheduled" or "recurring" card on file transactions._

**Unscheduled Credential On File:**

_For payments that aren’t recurring or installment - there are unscheduled options as well._

The first customer initiated transaction will include these two items (no billing method):

- initiated\_by=customer
- stored\_credential\_indicator=stored

## Examples

Example 5: In this request, an initial unscheduled sale is sent and an approved transaction is returned in the response. Store this transaction for the follow up request.

|     |     |
| --- | --- |
| Request | ...type=sale&initiated\_by=customer&stored\_credential\_indicator=stored... |
| Response | ...response=1&responsetext=Approved&transactionid=1234567890... |

The transaction ID can be used, without a billing method, for a customer initiated or merchant initiated transaction.

Please Note: The transaction ID cannot be used for a “recurring” or “installment” transaction.

**Unscheduled, Customer Initiated:** A card-absent transaction initiated by the cardholder where the cardholder does not need to enter their card details as the merchant uses the payment credential previously stored by the cardholder to perform the transaction. Examples include a transaction using customer’s merchant profile or digital wallet.

This is your typical shopping cart scenario where the customer checks out without having to re-enter their card details.

The follow up transaction(s) would include:

- initiated\_by=customer
- stored\_credential\_indicator=used

Example 6: In this request, a subsequent unscheduled sale is sent and an approved transaction is returned in the response.

|     |     |
| --- | --- |
| Request | ...type=sale&initiated\_by=customer&stored\_credential\_indicator=used... |
| Response | ...response=1&responsetext=Approved&transactionid=1234567891... |

**Unscheduled, Merchant Initiated:** A transaction using a stored credential for a fixed or variable amount that does not occur on a scheduled or regularly occurring transaction date, where the cardholder has provided consent for the merchant to initiate one or more future transactions. An example of this transaction is an account auto-top up transaction.

An example of an account auto-top up would be a customer with an account with a balance. When that balance gets low, the customer's card is charged automatically, without the customer's involvement.

The follow up transaction(s) would include:

- initiated\_by=merchant
- stored\_credential\_indicator=used
- initial\_transaction\_id=XXXXXXXXXX

Example 7: In this request, a subsequent unscheduled sale is sent and an approved transaction is returned in the response.

|     |     |
| --- | --- |
| Request | ...type=sale&initiated\_by=merchant&stored\_credential\_indicator=used&initial\_transaction\_id=1234567890... |
| Response | ...response=1&responsetext=Approved&transactionid=1234567892... |

**Appendix 1: Recommend Further Reading:**

If there is any question where a transaction type falls, we recommend reviewing the official card brand documentation. Visa’s guidelines are the most stringent, and generally if you follow those guidelines, you’ll also be compliant for MasterCard, American Express and Discover.

**Visa:**

[https://usa.visa.com/dam/VCOM/global/support-legal/documents/stored-credential-transaction-framework-vbs-10-may-17.pdf](https://usa.visa.com/dam/VCOM/global/support-legal/documents/stored-credential-transaction-framework-vbs-10-may-17.pdf)

**MasterCard:**

[https://www.mastercard.us/content/dam/public/mastercardcom/na/us/en/banks-and-credit-unions/other/credential-on-file-the-digital-commerce-growth-engine.pdf](https://www.mastercard.us/content/dam/public/mastercardcom/na/us/en/banks-and-credit-unions/other/credential-on-file-the-digital-commerce-growth-engine.pdf)

# Transaction Response Variables  Payment API

## Standard Response

| Variable Name | Description |
| --- | --- |
| response | 1 = Transaction Approved<br> 2 = Transaction Declined<br> 3 = Error in transaction data or system error |
| responsetext | Textual response |
| authcode | Transaction authorization code. |
| transactionid | Payment gateway transaction id. |
| avsresponse | AVS response code (See [AVS Response Codes](https://secure.easypaydirectgateway.com/gw/merchants/resources/integration/integration_portal.php#dp_appendix_1)). |
| cvvresponse | CVV response code (See See [CVV Response Codes](https://secure.easypaydirectgateway.com/gw/merchants/resources/integration/integration_portal.php#dp_appendix_2)). |
| orderid | The original order id passed in the transaction request. |
| response\_code | Numeric mapping of processor responses (See See [Result Code Table](https://secure.easypaydirectgateway.com/gw/merchants/resources/integration/integration_portal.php#dp_appendix_3)). |
| emv\_auth\_response\_data | This will optionally come back when any chip card data is provided on the authorization. This data needs to be sent back to the SDK after an authorization. |

# Conditional Response

| Variable Name | Description |
| --- | --- |
| customer\_vault\_id | The original customer\_vault\_id passed in the transaction request or the resulting customer\_vault\_id created on an approved transaction.<br>Note:  Only returned when the "Customer Vault" service is active. |
| kount\_score | The Kount "Omniscore" indicating the level of risk on a given transaction. The higher the score, the lower the risk.<br>Note: Only returned when the "Kount" service is active. |
| merchant\_advice\_code | Mastercard’s Merchant Advice Code (MAC) is returned in response if one is provided by the processor.<br>Note: Only returned if API configuration is set to return this value. |

# ECI Values

|  | Verified | Attempted | No 3DS (rarely shown) |
| --- | --- | --- | --- |
| Mastercard and Maestro | 02 | 01 | 00 |
| Other brands | 05 | 06 | 07 |

# Testing Information  Payment API

## Transaction Testing Methods

### Method 1: Put your account in test mode

Transactions can be submitted to any merchant account that is in test mode. Keep in mind that if an account is in test mode, all valid credit cards will be approved but no charges will actually be processed and nothing will be sent to the credit card or ACH processor.

### Method 2: Send in a one-off test transaction

One-off test transactions can be processed using the below `test_mode` variable. This will process this singular transaction in test mode, but it will not impact anything else on the account. An example use case would be running test transactions in a developent environment while your website is actively processing real transactions from customers.

|     |     |
| --- | --- |
| test\_mode: | If set to "enabled" _and_ providing one of the test credit card numbers listed below with "1025" as the expiration date, the single transaction will process in test mode. To see this transaction in reporting, you will need to toggle your account to test mode, but the Payment API testing can be done without doing this. |

### Method 3: Dedicated test account

The Payment Gateway Demo Account can be used for testing at any time. Please use the below security key for testing with this account. This account is always available and allows testing in a completely sandboxed environment. Like all testing methods, no card or check data will ever be sent for actual processing.

|     |     |
| --- | --- |
| security\_key: | 6457Thfj624V5r7WUwc5v6a68Zsd6YEm |

## Transaction POST URL

Transaction details should be POST'ed to the following URL:

|     |     |
| --- | --- |
| POST URL: | https://secure.easypaydirectgateway.com/api/transact.php |

## Test Data

Transactions can be submitted using the following information:

|     |     |
| --- | --- |
| Visa: | 4111111111111111 |
| MasterCard: | 5431111111111111 |
| Discover: | 6011000991300009 |
| American Express: | 341111111111111 |
| Diner's Club: | 30205252489926 |
| JCB: | 3541963594572595 |
| Maestro: | 6799990100000000019 |
| Credit Card Expiration: | 10/25 |
| account (ACH): | 24413815 |
| routing (ACH): | 490000018 |

## Triggering Errors in Test Mode

- To cause a declined message, pass an amount less than 1.00.
- To trigger a fatal error message, pass an invalid card number.
- To simulate an AVS match, pass 888 in the address1 field, 77777 for zip.
- To simulate a CVV match, pass 999 in the cvv field.

# AVS Response Codes  Payment API

## AVS Response Codes

|     |     |
| --- | --- |
| X | Exact match, 9-character numeric ZIP |
| Y | Exact match, 5-character numeric ZIP |
| D | Exact match, 5-character numeric ZIP |
| M | Exact match, 5-character numeric ZIP |
| 2 | Exact match, 5-character numeric ZIP, customer name |
| 6 | Exact match, 5-character numeric ZIP, customer name |
| A | Address match only |
| B | Address match only |
| 3 | Address, customer name match only |
| 7 | Address, customer name match only |
| W | 9-character numeric ZIP match only |
| Z | 5-character ZIP match only |
| P | 5-character ZIP match only |
| L | 5-character ZIP match only |
| 1 | 5-character ZIP, customer name match only |
| 5 | 5-character ZIP, customer name match only |
| N | No address or ZIP match only |
| C | No address or ZIP match only |
| 4 | No address or ZIP or customer name match only |
| 8 | No address or ZIP or customer name match only |
| U | Address unavailable |
| G | Non-U.S. issuer does not participate |
| I | Non-U.S. issuer does not participate |
| R | Issuer system unavailable |
| E | Not a mail/phone order |
| S | Service not supported |
| 0 | AVS not available |
| O | AVS not available |
| B | AVS not available |

# CVV Response Codes  Payment API

## CVV Response Codes

|     |     |
| --- | --- |
| M | CVV2/CVC2 match |
| N | CVV2/CVC2 no match |
| P | Not processed |
| S | Merchant has indicated that CVV2/CVC2 is not present on card |
| U | Issuer is not certified and/or has not provided Visa encryption keys |

# Result Code Table  Payment API

## Result Code Table

|     |     |
| --- | --- |
| 100 | Transaction was approved. |
| 200 | Transaction was declined by processor. |
| 201 | Do not honor. |
| 202 | Insufficient funds. |
| 203 | Over limit. |
| 204 | Transaction not allowed. |
| 220 | Incorrect payment information. |
| 221 | No such card issuer. |
| 222 | No card number on file with issuer. |
| 223 | Expired card. |
| 224 | Invalid expiration date. |
| 225 | Invalid card security code. |
| 226 | Invalid PIN. |
| 240 | Call issuer for further information. |
| 250 | Pick up card. |
| 251 | Lost card. |
| 252 | Stolen card. |
| 253 | Fraudulent card. |
| 260 | Declined with further instructions available. (See response text) |
| 261 | Declined-Stop all recurring payments. |
| 262 | Declined-Stop this recurring program. |
| 263 | Declined-Update cardholder data available. |
| 264 | Declined-Retry in a few days. |
| 300 | Transaction was rejected by gateway. |
| 400 | Transaction error returned by processor. |
| 410 | Invalid merchant configuration. |
| 411 | Merchant account is inactive. |
| 420 | Communication error. |
| 421 | Communication error with issuer. |
| 430 | Duplicate transaction at processor. |
| 440 | Processor format error. |
| 441 | Invalid transaction information. |
| 460 | Processor feature not available. |
| 461 | Unsupported card type. |

# Rate Limits  Payment API

## Rate Limits

In order to ensure the platform is available for everyone, in very rare cases, some users may encounter rate limits. If your request rate exceeds the limit, you may receive one of two responses: the Payment API-specific Rate Limit response, or the System-Wide Rate Limit response.

## Payment API-Specific Rate Limit

If you exceed the Payment API rate limit, you will receive a response with the following fields:

|     |     |
| --- | --- |
| response | 3 |
| responsetext | Rate limit exceeded |
| response\_code | 301 |

### Example

|     |     |
| --- | --- |
| Response | response=3&responsetext=Rate limit exceeded&authcode=&transactionid=&avsresponse=&cvvresponse=&orderid=&type=&response\_code=301 |

## System-Wide Rate Limit

You may encounter the system-wide rate limit if you using other services, for example if you are making requests to both the Payment API and the Query API, or if there are too many concurrent connections from your IP. In this case, your request will receive HTTP 429: Too Many Requests

## Handling Rate Limit Responses

#### Wait before retrying

If you receive a response\_code of 301 or an HTTP 429 response, do not immediately retry the request. Immediately retrying may increase the delay before transactions are allowed again.

#### Use fewer simultaneous connections

Reduce the number of threads or processes sending connections if you regularly encounter rate limits.

#### Check your credentials

Repeated authentication failures from your IP may result in temporarily lowered rate limits.

#### Contact support

If you've tried the above fixes and still need additional help, contact Customer Support for other options.

# Collect.js

Collect.js Tutorial from Gateway Services on Vimeo

![video thumbnail](https://i.vimeocdn.com/video/885340131-f5d095cb6a52631d466b2a8e1f8875f5022726ad9d2c7fc19339635792914725-d?mw=80&q=85)

Playing in picture-in-picture

Like

Add to Watch Later

Share

Play

00:00

08:03

Settings

QualityAuto

SpeedNormal

Picture-in-PictureFullscreen

[Watch on Vimeo](https://vimeo.com/412755269?fl=pl&fe=vl)

## Overview

Collect.js is a JavaScript framework that allows merchants to collect sensitive payment information from their customers without exposing their website to the sensitive information. This can be done while allowing merchants to retain full control over the look and feel of their checkout experience.

This is a data collection and tokenization system, not a full payments API, so you can use this in conjunction with an existing transaction API (Payment API) to submit transactions or use other gateway services that utilize payment information.

## Usage

Collect.js is designed to be flexible, and its implementation can be as simple as pasting a single script tag to your checkout page, or it can be customized to interact with your website however you’d like.

## Authentication

Authentication is done via a "tokenization key" that you can generate in your merchant control panel under the "Security Keys" settings page. Select a public key, and then "Tokenization" for the key permissions.

This tokenization key can only be used with Collect.js and will not work with any other APIs. Similarly, any API keys already created will not work with Collect.js.

**This key will be visible to customers in your website’s source code, so please make sure you only use the tokenization key here.**

![](<Base64-Image-Removed>)

# The Payment Token

This is a new variable added to the Payment API that should be used in conjunction with this tool. This is what Collect.js will return to your website and it takes the place of the sensitive card or bank account information. It will look something like this:

```

3455zJms-7qA2K2-VdVrSu-Rv7WpvPuG7s8


```

This variable can be used in place of the existing ccnumber, ccexp, and cvv variables we have today. For ACH transactions (details below) it can be used in place of checkname, checkaba, and checkaccount.

The payment token can only be used once, and will expire after 24 hours if it is not used at all.

The payment token will also work when adding customers to the Customer Vault or recurring subscriptions. Just use "payment\_token" where you were using the credit card and ACH account information before.

For example, if you would previously send this string:

```

type=sale&amount=3.00&ccnumber=4111111111111111&ccexp=1020&cvv=123


```

Or:

```

type=sale&amount=3.00&checkname=Jane Doe&checkaba=490000018&checkaccount=24413815


```

You could now send this:

```

type=sale&amount=3.00&payment_token=3455zJms-7qA2K2-VdVrSu-Rv7WpvPuG7s8


```

## Test Tokens

If you would like to test using the payment token without using Collect.js to create one, you can use the below tokens to return test credit card and bank account information.

| **Payment Token Value** | **Test Data** |
| --- | --- |
| 00000000-000000-000000-000000000000 | Card: 4111111111111111, Expiration: October 2025, CVV: 999 |
| 11111111-111111-111111-111111111111 | ABA: 490000018, Account: 24413815, Name: Jane Doe |

# Integration Types

Collect.js supports two different ways to integrate with your site. Both offer the same basic functionality and security, so you can choose based on your interface and design requirements,

## Lightbox Integration

```
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>

<!-- Collect.js is loaded -->
<script src="https://secure.easypaydirectgateway.com/token/Collect.js" data-tokenization-key="5mN8N7-jhr55W-N22pxX-uAW2s9">
</script>

<body>
  <h2 class="pageTitle"><span>Lightbox Example</span></h2>

  <form class="theForm">
    <div class="formInner">
      <div class="form-group">
        <input type="text" class="form-control" placeholder="First Name" name="fname" value="John" autofocus>
      </div>
      <div class="form-group">
        <input type="text" class="form-control" placeholder="Last Name" name="lname" value="Smith">
      </div>
      <div class="form-group">
        <input type="text" class="form-control" placeholder="Street Address" name="address1" value="123 Collect Js.">
      </div>
      <div class="form-group">
        <input type="text" class="form-control" placeholder="City" name="city" value="SAQ-A">
      </div>
      <div class="form-group">
        <input type="state" class="form-control" placeholder="State" name="state" value="IL">
      </div>
      <div class="form-group">
        <input type="text" class="form-control" placeholder="Zip code" name="zip" value="12345">
      </div>
    </div>

    <input type="submit" id="payButton" value="Pay $5" class="btn btn-primary btn-block">

  </form>

  <div id="paymentTokenInfo"></div>

</body>

```

```
html {
  font-family: 'Abel';
}

.pageTitle {
  text-align: center;
  margin-top: 20px;
  font-size: 40px;
  font-family: "Domine" !important;
}

.form-group {
  width: 290px;
}

.formInner {
  width: 600px;
  max-width: 100%;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  margin: 20px auto;
}

#payButton {
  width: 290px;
  display: block;
  margin: 20px auto;
  height: 50px !important;
  font-size: 20px;
  background-color: #37805B;
  border-color: #37805B;
  box-shadow: 0 3px 10px #bbbbbb;
}

#payButton:hover {
  background-color: #19C687;
  border-color: #19C687;
  box-shadow: 0 3px 4px #bbbbbb;
}

#payButton:active {
  opacity: 0.7;
}

.form-control {
  border: 3px solid #FFFFFF !important;
  box-shadow: 0 2px 8px #dddddd !important;
  font-family: 'Abel';
}

.form-control:hover {
  box-shadow: 0 2px 4px #dddddd;
}

.form-control:focus {
  box-shadow: 0 2px 4px #dddddd !important;
  border: 3px solid #37805B !important;
}

#paymentTokenInfo {
  display: block;
  width: 600px;
  margin: 30px auto;
}

@media only screen and (max-width: 600px) {
  .pageTitle {
    font-size: 30px;
  }

  .theForm {
    width: 300px;
    max-width: 90%;
    margin: auto;
  }

  .form-group {
    width: 100%;
  }

  #paymentTokenInfo {
    width: 100%;
  }
}

```

```
// This prints out the contents of the payment token to the page.
document.addEventListener('DOMContentLoaded', function () {
  CollectJS.configure({
    'paymentType': 'cc',
    'callback': function (response) {
      document.getElementById("paymentTokenInfo").innerHTML =
        '<b>Payment Token:</b> ' + response.token +
        '<br><b>Card:</b> ' + response.card.number +
        '<br><b>BIN/EIN:</b> ' + response.card.bin +
        '<br><b>Expiration:</b> ' + response.card.exp +
        '<br><b>Hash:</b> ' + response.card.hash +
        '<br><b>Card Type:</b> ' + response.card.type +
        '<br><b>Check Account Name:</b> ' + response.check.name +
        '<br><b>Check Account Number:</b> ' + response.check.account +
        '<br><b>Check Account Hash:</b> ' + response.check.hash +
        '<br><b>Check Routing Number:</b> ' + response.check.aba;
    }
  });
});

```

The "lightbox" integration displays all sensitive payment fields in a single "pop-up" style display. All the entry and validation of payment data occurs within this single box; once valid information is provided, an event is provided for your page to capture the finished Payment Token.

## Inline Integration

```
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <!-- COLLECT.JS INLINE -->
    <script src="https://secure.easypaydirectgateway.com/token/Collect.js"
        data-tokenization-key="5mN8N7-jhr55W-N22pxX-uAW2s9"></script>
</head>

<body>
    <h2 class="pageTitle"><span>Collect.js Inline Example</span></h2>

    <form class="theForm" action="">
        <input type="hidden" name="variant" value="inline">
        <input type="hidden" name="amount" value="5.00">
        <div class="formInner">
            <div class="payment-field">
                <input type="text" name="fname" placeholder="First Name" value="John" autofocus>
            </div>
            <div class="payment-field">
                <input type="text" name="lname" placeholder="Last Name" value="Smith">
            </div>
            <div class="separator"></div>
            <div id="payment-fields">
                <div class="payment-field" id="ccnumber"></div>
                <div class="payment-field" id="ccexp"></div>
                <div class="payment-field" id="cvv"></div>
            </div>
        </div>

        <button type="submit" id="payButton" class="btn btn-primary btn-block">
            Pay $5
        </button>
    </form>
    <div id="paymentTokenInfo"></div>
</body>
```

```
html {
    font-family: 'Abel';
}

.pageTitle {
    text-align: center;
    margin-top: 20px;
    font-size: 40px;
    font-family: "Domine" !important;
}

.form-group {
    width: 290px;
}

.formInner {
    font-family: 'Abel' !important;
    width: 500px;
    max-width: 100%;
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    margin: 20px auto;
}

#payButton {
    width: 290px;
    display: block;
    margin: 20px auto;
    height: 50px !important;
    font-size: 20px;
    background-color: #37805B;
    border-color: #37805B;
    box-shadow: 0 3px 10px #bbbbbb;
}

#payButton:hover {
    background-color: #19C687;
    border-color: #19C687;
    box-shadow: 0 3px 4px #bbbbbb;
}

#payButton:active {
    opacity: 0.7;
}

.checkboxLabel {
    margin: 0 0 0 7px;
}

.payment-field {
    border-radius: 2px;
    width: 48%;
    margin-bottom: 14px;
    box-shadow: 0 2px 8px #dddddd;
    font-size: 16px;
    transition: 200ms;
}

.payment-field input:focus {
    border: 3px solid #37805B;
    outline: none !important;
}

.payment-field:hover {
    box-shadow: 0 2px 4px #dddddd;
}

.payment-field input {
    border: 3px solid #FFFFFF;
    width: 100%;
    border-radius: 2px;
    padding: 4px 8px;
}

#payment-fields {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
}

#ccnumber {
    width: 100%;
    font-size: 24px;
}

#ccexp,
#cvv {
    font-size: 20px;
}

#paymentTokenInfo {
    width: 600px;
    display: block;
    margin: 30px auto;
}

.separator {
    margin-top: 30px;
    width: 100%;
}

@media only screen and (max-width: 600px) {
    .pageTitle {
        font-size: 30px;
    }

    .theForm {
        width: 300px;
        max-width: 90%;
        margin: auto;
    }

    .form-group {
        width: 100%;
    }
}

```

```
document.addEventListener('DOMContentLoaded', function () {
  CollectJS.configure({
    'callback': function (response) {
      document.getElementById("paymentTokenInfo").innerHTML =
        '<b>Payment Token:</b> ' + response.token +
        '<br><b>Card:</b> ' + response.card.number +
        '<br><b>BIN/EIN:</b> ' + response.card.bin +
        '<br><b>Expiration:</b> ' + response.card.exp +
        '<br><b>Hash:</b> ' + response.card.hash +
        '<br><b>Card Type:</b> ' + response.card.type +
        '<br><b>Check Account Name:</b> ' + response.check.name +
        '<br><b>Check Account Number:</b> ' + response.check.account +
        '<br><b>Check Account Hash:</b> ' + response.check.hash +
        '<br><b>Check Routing Number:</b> ' + response.check.aba;
    },
    variant: 'inline',
    googleFont: 'Abel',
    invalidCss: {
      color: '#B40E3E'
    },
    validCss: {
      color: '#175033'
    },
    customCss: {
      'border-color': '#FFFFFF',
      'border-style': 'solid'
    },
    focusCss: {
      'border-color': '#37805B',
      'border-style': 'solid',
      'border-width': '3px'
    },
    fields: {
      cvv: {
        placeholder: 'CVV'
      },
      ccnumber: {
          placeholder: 'Credit Card'
      },
      ccexp: {
          placeholder: 'MM / YY'
      }
    }
  });
});

```

The "inline" integration allows you to seamlessly build Collect.js into your payment form. This solution allows you to create a payment form that looks and feels exactly like your website, but without the need for your service to handle any sensitive payment information.

This works by creating iframes on your website for each credit card or electronic check field you need your customers to fill out. Using our custom "style sniffer" these fields will typically look exactly like the other fields on the page. If you want to just style them however you want, you can do that too by passing in custom CSS.

# Simple Lightbox Implementation

See the [Simple Example](https://secure.easypaydirectgateway.com/gw/merchants/resources/integration/integration_portal.php#cjs_example_1) for a basic web page using this implementation.

The simplest way to integrate is by pasting in the following script tag to your web page (preferably in the header) where you’ll be collecting payments:

```xml

<script src="https://secure.easypaydirectgateway.com/token/Collect.js" data-tokenization-key="your-token-key-here"></script>


```

With this script, you just need to add a button with the ID of "payButton" to your page inside a form where you ask for the customer’s information (name, address, email, etc.) You should make this button somewhere that indicates to the customer that they will be prompted to enter their card information and check out. Collect.js will find this button and display the below form in a lightbox over your website.

![](<Base64-Image-Removed>)

The customer will enter their card information and when they submit this mini-form, the lightbox will disappear, a hidden field will be inserted into your form with the "payment\_token" value, and your form will be submitted.

You can then submit the transaction to the gateway with the Payment API using the "payment\_token" variable.

# Advanced Lightbox Implementation

_**See the [advanced HTML example](https://secure.easypaydirectgateway.com/gw/merchants/resources/integration/integration_portal.php#cjs_example_2) and [advanced JavaScript example](https://secure.easypaydirectgateway.com/gw/merchants/resources/integration/integration_portal.php#cjs_example_2_js) files for examples.**_

If you want to have a little more control over the default behavior, you can pass in additional data elements in the script tag. Here’s an example using all the available variables:
`
`

```applescript

<script
        src="https://secure.easypaydirectgateway.com/token/Collect.js"
        data-tokenization-key="your-token-key-here"
        data-payment-selector=".customPayButton"
        data-primary-color="#ff288d"
        data-theme="bootstrap"
        data-secondary-color="#ffe200"
        data-button-text="Submit the Payment"
        data-instruction-text="Enter Card Information"
        data-payment-type="cc"
        data-field-cvv-display="hide"
        data-price="1.00"
        data-currency="USD"
        data-country="US"
        data-field-google-pay-shipping-address-required="true"
        data-field-google-pay-shipping-address-parameters-phone-number-required="true"
        data-field-google-pay-shipping-address-parameters-allowed-country-codes="US,CA"
        data-field-google-pay-billing-address-required="true"
        data-field-google-pay-billing-address-parameters-phone-number-required="true"
        data-field-google-pay-billing-address-parameters-format="MIN"
        data-field-google-pay-email-required="true"
        data-field-google-pay-button-type="buy"
        data-field-google-pay-button-locale="en"
        data-field-google-pay-button-color="default"
        data-field-apple-pay-shipping-type="delivery"
        data-field-apple-pay-shipping-methods='[{"label":"Free Standard Shipping","amount":"0.00","detail":"Arrives in 5-7 days","identifier":"standardShipping"},{"label":"Express Shipping","amount":"10.00","detail":"Arrives in 2-3 days","identifier":"expressShipping"}]'
        data-field-apple-pay-required-billing-contact-fields='["postalAddress","name"]'
        data-field-apple-pay-required-shipping-contact-fields='["postalAddress","name"]'
        data-field-apple-pay-contact-fields='["phone","email"]'
        data-field-apple-pay-contact-fields-mapped-to='shipping'
        data-field-apple-pay-line-items='[{"label":"Foobar","amount":"3.00"},{"label":"Arbitrary Line Item #2","amount":"1.00"}]'
        data-field-apple-pay-total-label='foobar'
        data-field-apple-pay-total-type='pending'
        data-field-apple-pay-type='buy'
        data-field-apple-pay-style-button-style='black'
        data-field-apple-pay-style-height='40px'
        data-field-apple-pay-style-border-radius='4px'
        data-field-apple-pay-is-recurring-transaction="true"
        data-field-apple-pay-recurring-payment-description="A description of the recurring payment to display to the user in the payment sheet."
        data-field-apple-pay-recurring-billing-agreement="A localized billing agreement displayed to the user in the payment sheet prior to the payment authorization."
        data-field-apple-pay-recurring-management-url="https://applepaydemo.apple.com"
        data-field-apple-pay-recurring-token-notification-url="https://applepaydemo.apple.com"
        data-field-apple-pay-recurring-label="Recurring"
        data-field-apple-pay-recurring-amount="4.99"
        data-field-apple-pay-recurring-payment-timing="recurring"
        data-field-apple-pay-recurring-recurring-payment-start-date="2023-08-11T11:20:32.369Z"
        data-field-apple-pay-recurring-recurring-payment-interval-unit="month"
        data-field-apple-pay-recurring-recurring-payment-interval-count="6"
        data-field-apple-pay-recurring-recurring-payment-end-date="2024-08-11T11:20:32.369Z"
></script>

```

`
`

## Configuration Variables

| **Variable** | **Format** | **Behavior** |
| --- | --- | --- |
| data-tokenization-key | String | Authenticates the request |
| data-payment-selector | String | Tells Collect.js what class or id value will trigger the lightbox<br>**Default: "#payButton"** |
| data-primary-color | String | The HEX value for the color of the submit button in the lightbox <br>**Default: "#007BFF"** |
| data-theme | String ("bootstrap" or "material") | The version of the payment form customers will see. All available themes will use the primary and secondary colors provided.<br>**Default: "bootstrap"** |
| data-secondary-color | String | The HEX value for the color of the lightbox border <br>**Default: "#282828"** |
| data-button-text | String | The text that will display on the submit button in the lightbox<br>**Default: "Submit Payment"** |
| data-instruction-text | String | The text that will display above the payment fields. Custom text should be short so as not to overlap with other elements in the lightbox.<br>**Default: "Please enter payment info"** |
| data-payment-type | String ("cc" or "ck") | Whether the lightbox shows credit card or check fields ("cc" for credit cards or "ck" for checks)<br>**Default: "cc"** |
| data-field-cvv-display | String ("show", "hide", or "required") | Whether the CVV field is required ("required"), optional ("show"), or not displayed at all ("hide"). Also supported as `data-field-cvv` for legacy users. <br>**Default: "required"** |
| data-field-google-pay-selector | String | A CSS selector for the Google Pay field.<br>**Default: "#googlepaybutton"** |
| data-field-google-pay-shipping-address-required | String ("true" or "false") | Determines whether or not Google Pay should capture shipping address information. Shipping information captured this way becomes stored in the payment token.<br>**Default: "false"** |
| data-field-google-pay-shipping-address-parameters-phone-number-required | String ("true" or "false") | Determines whether or not Google Pay should capture a phone number from the user’s shipping phone number. Phone numbers captured this way become stored in the payment token.<br>**Default: "false"** |
| data-field-google-pay-shipping-address-parameters-allowed-country-codes | String (comma delimited list of 2 character country codes) | List of allowed countries. Credit cards from outside these countries will not be displayed as acceptable options within the Google Pay payment sheet. Omitting this value allows credit cards from any country.<br>**Default: undefined** |
| data-field-google-pay-billing-address-required | String ("true" or "false") | Determines whether or not Google Pay should capture billing address information. Billing information captured this way becomes stored in the payment token.<br>**Default: "false"** |
| data-field-google-pay-billing-address-parameters-phone-number-required | String ("true" or "false") | Determines whether or not Google Pay should capture a phone number from the user’s billing phone number. Phone numbers captured this way become stored in the payment token.<br>**Default: "false"** |
| data-field-google-pay-billing-address-parameters-format | String ("MIN" or "FULL") | Determines which billing address fields to capture from the user. "MIN" provides "zip", "country", "first\_name" and "last\_name". "FULL" additionally provides "address1", "address2", "city", "state". <br>**Default: "MIN"** |
| data-field-google-pay-email-required | String ("true" or "false") | Determines whether or not Google Pay should capture an email address. Email addresses captured this way becomes stored in the payment token.<br>**Default: "false"** |
| data-field-google-pay-button-type | String ("short", "long", "book", "buy", "checkout", "donate", "order", "pay", "plain", "subscribe", "short" or "long") | Determines the text that appears on the Google Pay button.<br>**Default: "buy"** |
| data-field-google-pay-button-locale | String ("en", "ar", "bg", "ca", "cs", "da", "de", "el", "es", "et", "fi", "fr", "hr", "id", "it", "ja", "ko", "ms", "nl", "no", "pl", "pt", "ru", "sk", "sl", "sr", "sv", "th", "tr", "uk", "zh) | The language that the button text appears in.<br>**Default: "en" (English)** |
| data-field-google-pay-button-color | String ("default", "black", "white") | The color to display the Google Pay button. "Default" allows Google to determine the color.<br>**Default: "default"** |
| data-field-google-pay-total-price-status | String ("FINAL" or "ESTIMATED") | The status of the total price being used.<br>"FINAL" should be used when the amount is not expected to change.<br>"ESTIMATED" should be used when the amount might change based on upcoming factors such as sales tax based on billing address.<br>**Default: "FINAL"** |
| data-field-apple-pay-selector | String (CSS Selector) | A CSS selector for the Apple Pay field.<br>**Default: "#applepaybutton"** |
| data-field-apple-pay-shipping-type | String ("shipping", "delivery", "storePickup", or "servicePickup") | The way purchases will be sent to the customer. For transactions that do not need to be sent to a customer, omit data-field-apple-pay-required-shipping-contact-fields.<br>**Default: "shipping"** |
| data-field-apple-pay-shipping-methods | String (JSON array of objects) | The shipping information that appears on the payment sheet. Example: '\[{"label":"Free Standard Shipping","amount":"0.00","detail":"Arrives in 5-7 days","identifier":"standardShipping"}\]'<br>**Default: "\[\]"** |
| data-field-apple-pay-required-billing-contact-fields | String (JSON array of "name" or "postalAddress") | When "name" or "postalAddress" is provided, the payment sheet will collect a customer's name or address. These values will be included with the transaction's billing information. Example:'\["name","postalAddress"\]'<br>**Default: "\[\]"** |
| data-field-apple-pay-required-shipping-contact-fields | String (JSON array of "name" or "postalAddress") | When "name" or "postalAddress" is provided, the payment sheet will collect a customer's name or address. These values will be included with the transaction's shipping information. Example:'\["name","postalAddress"\]'<br>**Default: "\[\]"** |
| data-field-apple-pay-contact-fields | String (JSON array of "phone" or "email") | When "phone" or "email" is provided, the payment sheet will collect a customer's phone number or email address. Usage of this data is determined by the data-field-apple-pay-contact-fields-mapped-to value. Example: '\["phone","email"\]'<br>**Default: "\[\]"** |
| data-field-apple-pay-contact-fields-mapped-to | String ("billing" or "shipping") | "billing" causes data collected via the data-field-apple-pay-contact-fields options to be included in a transactions "phone" and "email" values. "shipping" causes them to be included as "shipping\_phone", "shipping\_email".<br>**Default: "billing"** |
| data-field-apple-pay-line-items | String (JSON array of objects) | Items that will appear in the Apple Pay payment sheet. Example: \[{"label":"Foobar","amount":"3.00"}\]<br>**Default: "\[\]"** |
| data-field-apple-pay-total-label | String | Text that appears next to the final amount in the Apple Pay payment sheet.<br>**Default: "Total"** |
| data-field-apple-pay-total-type | String ("pending" or "final") | A value that indicates whether the total is final or pending. When set to "pending" the customer will see "Amount Pending" on the ApplePay checkout form instead of a total amount.<br>**Default: "final"** |
| data-field-apple-pay-type | String ("buy", "donate",<br> "plain", "set-up", "book", "check-out", "subscribe", "add-money", "contribute",<br> "order", "reload", "rent", "support", "tip", or "top-up") | The text that appears on an Apple Pay button. Some options are only supported by newer versions of iOS and macOS.<br> <br>**Default: "buy"** |
| data-field-apple-pay-style-button-style | String ("black", "white", or "white-outline") | The appearance of the Apple Pay button.<br>**Default: "black"** |
| data-field-apple-pay-style-height | String | The height of the Apple Pay button.<br>**Default: "30px"** |
| data-field-apple-pay-style-border-radius | String | The rounding of the corners on the Apple Pay button.<br>**Default: "4px"** |
| data-field-apple-pay-recurring-payment-description | String | A description of the recurring payment to display to the user in the payment sheet. Value of data-field-apple-pay-is-recurring-transaction must be true in order to use. Required for recurring. <br>**Example:** "Monthly subscription for premium features." <br>**Default:** "" |
| data-field-apple-pay-is-recurring-transaction | String ("true" or "false") | Marks the Apple Pay transaction as a recurring transaction. **Default: "false"** |
| data-field-apple-pay-recurring-payment-description | String | A description of the recurring payment to display to the user in the payment sheet. Value of data-field-apple-pay-is-recurring-transaction must be true in order to use. Required for recurring. <br>**Example:** "Monthly subscription for premium features." <br>**Default:** "" |
| data-field-apple-pay-recurring-billing-agreement | String | A localized billing agreement displayed to the user prior to payment authorization. Value of data-field-apple-pay-is-recurring-transaction must be true in order to use. Optional. <br>**Example:** "By subscribing, you agree to the terms and conditions." <br>**Default:** "" |
| data-field-apple-pay-recurring-label | String | The label for the recurring payment. Example: "Recurring". <br> Value of **data-field-apple-pay-is-recurring-transaction** must be **true** in order to use. |
| data-field-apple-pay-recurring-amount | String (Decimal) | The amount to be charged for the recurring payment. Example: "4.99". <br> Value of **data-field-apple-pay-is-recurring-transaction** must be **true** in order to use. |
| data-field-apple-pay-recurring-payment-timing | String | The timing of the recurring payment. Example: "recurring". <br> Value of **data-field-apple-pay-is-recurring-transaction** must be **true** in order to use. |
| data-field-apple-pay-recurring-payment-start-date | String (ISO 8601 Datetime) | The start date of the recurring payment. Example: "2023-08-11T11:20:32.369Z". <br> Value of **data-field-apple-pay-is-recurring-transaction** must be **true** in order to use. |
| data-field-apple-pay-recurring-payment-interval-unit | String | The unit of time for the recurring payment interval. Possible values: "day", "week", "month", "year". Example: "month". <br> Value of **data-field-apple-pay-is-recurring-transaction** must be **true** in order to use. |
| data-field-apple-pay-recurring-payment-interval-count | Integer | The number of units per payment interval. Example: 6. <br> Value of **data-field-apple-pay-is-recurring-transaction** must be **true** in order to use. |
| data-field-apple-pay-recurring-payment-end-date | String (ISO 8601 Datetime) | The end date of the recurring payment. Example: "2024-08-11T11:20:32.369Z". <br> If this field is omitted, the recurring transaction will continue until canceled. |
| data-field-apple-pay-recurring-management-url | String | A URL to the merchant's management portal where users can manage their subscriptions. Value of data-field-apple-pay-is-recurring-transaction must be true in order to use this field. Required for recurring. <br>**Example:** "https://example.com/manage-tokens" <br>**Default:** "" |
| data-field-apple-pay-recurring-token-notification-url | String | A URL where tokenization events (e.g., token refresh, expiration) are sent. Value of data-field-apple-pay-is-recurring-transaction must be true in order to use this field. Optional. <br>**Example:** "https://example.com/token-notify" <br>**Default:** "" |
| data-price | String | The final cost that the user will be charged.<br>**Default: undefined**<br>**Required if using Apple Pay** |
| data-country | String | The country where the transaction is processed.<br>**Required if using Google Pay or Apple Pay** |
| data-currency | String | The currency the transaction will use to process the transaction.<br>**Required if using Google Pay or Apple Pay** |

## Collect.js Functions

| Function Name | Parameters | Description |
| --- | --- | --- |
| configure | Object | Call this when you’d like to reconfigure Collect.js. Collect.js will try to run this automatically on page load, but you can run it manually to change the configuration at any time.<br>This method optionally accepts an object with all configuration variables you’re using for Collect.js. |
| startPaymentRequest | Event | Call this to bring up the lightbox with the secure payment form for the customer to fill out. If you are using the "payButton" ID or custom payment selector, this will automatically be called when the customer clicks that element on the page.<br>This method accepts an event object as an optional parameter and will call the provided callback function with a token response and the optional event. |
| closePaymentRequest |  | Call this to dismiss the lightbox. This replicates the behavior of the user clicking the "close" button inside the lightbox. No card or checking information will be saved. |

You may also choose to configure Collect.js directly in your JavaScript, in which case you can do all of the above, and also implement a callback function that will execute when the customer submits the lightbox form. The payment token value will be returned in a "response" variable that you can do whatever you’d like with.

`
`

```vbscript
{
	tokenType:"lightbox",
	token:"3455zJms-7qA2K2-VdVrSu-Rv7WpvPuG7s8",
	initiatedBy: Event,
	card:{
		number: "411111******1111",
		bin: "411111",
        exp: "1028",
        hash: "abcdefghijklmnopqrstuv1234567890",
		type: "visa"
	},
	check:{
		name:null,
		account:null,
		hash:null,
		aba:null,
		transit:null,
		institution:null
	},
	wallet: {
		cardDetails: null,
		cardNetwork: null,
		email: null,
		billingInfo: {
			address1: null,
			address2: null,
			firstName: null,
			lastName: null,
			postalCode: null,
			city: null,
			state: null,
			country: null,
			phone: null

		},
		shippingInfo: {
			address1: null,
			address2: null,
			firstName: null,
			lastName: null,
			postalCode: null,
			city: null,
			state: null,
			country: null,
			phone: null
		}

	}
}

```

`
`

This implementation method allows for additional changes to the look and feel to better match your website's UI

![](<Base64-Image-Removed>)

# Expert Lightbox Implementation

If you have a webpage where you would like the lightbox to trigger without an element getting clicked, then you can call the following function:

```

CollectJS.startPaymentRequest(event)


```

This function will trigger the lightbox to show up and request payment details. If you wish to change any options, this should be done before calling this function since changes after this point wont affect the lightbox.

This function optionally receives an event object. If an event is passed into the startPaymentRequest function, that same event will exist in the callback's response variable under "response.initiatedBy". This can be used to track what event started the payment request and the next steps.

`
`

```vbscript
{
	tokenType:"lightbox",
	token:"3455zJms-7qA2K2-VdVrSu-Rv7WpvPuG7s8",
	initiatedBy: Event,
	card:{
		number: "411111******1111",
		bin: "411111",
        exp: "1028",
        hash: "abcdefghijklmnopqrstuv1234567890",
		type: "visa"
	},
	check:{
		name:null,
		account:null,
		hash:null,
		aba:null,
		transit:null,
		institution:null
	},
	wallet: {
		cardDetails: null,
		cardNetwork: null,
		email: null,
		billingInfo: {
			address1: null,
			address2: null,
			firstName: null,
			lastName: null,
			postalCode: null,
			city: null,
			state: null,
			country: null,
			phone: null

		},
		shippingInfo: {
			address1: null,
			address2: null,
			firstName: null,
			lastName: null,
			postalCode: null,
			city: null,
			state: null,
			country: null,
			phone: null
		}

	}
}

```

`
`

If you wish to close the payment request without waiting for the user to click the close button, you can call the function:

```

CollectJS.closePaymentRequest()


```

This function will remove the lightbox from the page. No other functions will trigger from this function being called, including the callback.

Note that this implementation also requires you to include the standard script tag on the page as well.

# Simple Integration Implementation

See the [Simple Inline Example](https://secure.easypaydirectgateway.com/gw/merchants/resources/integration/integration_portal.php#cjs_example_inline1) for a basic web page using this implementation.

While the Inline integration model offers many customizable options, you can also get started quickly with a basic form. First, install the following JavaScript on your payment form page, preferably in the HEAD element:

```xml

<script src="https://secure.easypaydirectgateway.com/token/Collect.js" data-tokenization-key="your-token-key-here" data-variant="inline"></script>


```

This script assumes that you've set up a payment form already. The form can be laid out however you'd like, but there should be block-level elements (`div`, for example) where the sensitive payment info will be collected. The following IDs are expected to be used in place of standard form inputs:

**For Credit Card Payments**

- `ccnumber` (Credit card number)
- `ccexp` (Credit card expiration date)
- `cvv` (CVV)

**For Electronic Check Payments**

- `checkname` (Checking account name)
- `checkaccount` (Checking account number)
- `checkaba` (Routing number)
- `checktransit` (Check transit)
- `checkinstitution` (Check institution)

This is a very basic form that has integrated Inline Collect.js.

```applescript

<form>
    <input type="text" id="first_name">
    <input type="text" id="last_name">
    <input type="text" id="address">
    <div id="ccnumber"></div>
    <div id="ccexp"></div>
    <div id="cvv"></div>
    <input type="submit" id="payButton">
</form>


```

These elements will have iframes inserted into them, contents of which will be hosted by the gateway. They will be full width text fields and will use the style sniffer to match the rest of your page. The ID values let us know what field is collecting what information from the customer.

In addition to the empty fields, there must be a submit button in the form with an ID of "`payButton`." When the customer clicks this to submit the form, Collect.js will collect the data from all inline iframes and submit the form with a new "`payment_token`" value which is an encrypted version of the payment data.

After this form is submitted to your site, you can submit the data to the gateway via the Payment API. For example:

```http

security_key: 3456h45k6b4k56h54kj6h34kj6445hj4
type: sale
amount: 4.00
payment_token: 3455zJms-7qA2K2-VdVrSu-Rv7WpvPuG7s8
first_name: Jane
last_name: Doe
address: 123 Main St.


```

If you are using `checktransit` and `checkinstitution` make sure you include currency of "CAD" when you submit the data to the gateway via the Payment API. For example:

```http

security_key: 3456h45k6b4k56h54kj6h34kj6445hj4
type: sale
amount: 4.00
payment_token: 3455zJms-7qA2K2-VdVrSu-Rv7WpvPuG7s8
first_name: Jane
last_name: Doe
address: 123 Main St.
currency: CAD


```

# Advanced Implementation Method

_**See the [advanced HTML example](https://secure.easypaydirectgateway.com/gw/merchants/resources/integration/integration_portal.php#cjs_example_inline2) and [advanced JavaScript example](https://secure.easypaydirectgateway.com/gw/merchants/resources/integration/integration_portal.php#cjs_example_inline2_js) files for examples.**_

If the simple implementation does not give you everything you need, then you can use the advanced implementation to customize the experience more to your liking. The options available are extensive, and you may use as many or as few as you want. Below is an example of using every variable possible.

```applescript

<script
        src="https://secure.easypaydirectgateway.com/token/Collect.js"
        data-tokenization-key="your-token-key-here"
        data-variant="inline"
        data-payment-selector="#demoPayButton"
        data-style-sniffer="false"
        data-google-font="Montserrat:400"
        data-validation-callback = "(function (field, valid, message) {console.log(field + ': ' + valid + ' -- ' + message)})"
        data-custom-css='{
            "background-color": "#a0a0ff",
            "color": "#0000ff"
        }'
        data-invalid-css='{
            "background-color":"red",
            "color":"white"
        }'
        data-valid-css='{
            "background-color":"#d0ffd0",
            "color":"black"
        }'
        data-placeholder-css='{
            "background-color":"#687C8D",
            "color":"green"
        }'
        data-focus-css='{
            "background-color":"#202020",
            "color":"yellow"
        }'
        data-timeout-duration = "10000"
        data-timeout-callback = "(function() {console.log('Timeout reached')})"
        data-apple-pay-recurring-mismatch-callback = "(function() {console.log('Apple Pay version needs to be updated')})"
        data-fields-available-callback = "(function() {console.log('Collect.js has added fields to the form')})"
        data-field-ccnumber-selector = '#demoCcnumber'
        data-field-ccnumber-title = 'Card Number'
        data-field-ccnumber-placeholder = '0000 0000 0000 0000'
        data-field-ccexp-selector = '#demoCcexp'
        data-field-ccexp-title = 'Expiration Date'
        data-field-ccexp-placeholder = '00 / 00'
        data-field-cvv-display = 'required'
        data-field-cvv-selector = '#demoCvv'
        data-field-cvv-title = 'CVV Code'
        data-field-cvv-placeholder = '***'
        data-field-checkaccount-selector = '#demoCheckaccount'
        data-field-checkaccount-title = 'Account Number'
        data-field-checkaccount-placeholder = '000000000000'
        data-field-checkaba-selector = '#demoCheckaba'
        data-field-checkaba-title = 'Routing Number'
        data-field-checkaba-placeholder = '000000000'
        data-field-checkname-selector = '#demoCheckname'
        data-field-checkname-title = 'Account Name'
        data-field-checkname-placeholder = 'Customer Name'
        data-field-checktransit-selector = '#demoChecktransit'
        data-field-checktransit-title = 'Check Transit'
        data-field-checktransit-placeholder = '00000'
        data-field-checkinstitution-selector = '#demoCheckinstitution'
        data-field-checkinstitution-title = 'Check Institution'
        data-field-checkinstitution-placeholder = '000'
        data-price="1.00"
        data-currency="USD"
        data-country="US"
        data-field-google-pay-shipping-address-required="true"
        data-field-google-pay-shipping-address-parameters-phone-number-required="true"
        data-field-google-pay-shipping-address-parameters-allowed-country-codes="US,CA"
        data-field-google-pay-billing-address-required="true"
        data-field-google-pay-billing-address-parameters-phone-number-required="true"
        data-field-google-pay-billing-address-parameters-format="MIN"
        data-field-google-pay-email-required="true"
        data-field-google-pay-button-type="buy"
        data-field-google-pay-button-locale="en"
        data-field-google-pay-button-color="default"
        data-field-apple-pay-shipping-type="delivery"
        data-field-apple-pay-shipping-methods='[{"label":"Free Standard Shipping","amount":"0.00","detail":"Arrives in 5-7 days","identifier":"standardShipping"},{"label":"Express Shipping","amount":"10.00","detail":"Arrives in 2-3 days","identifier":"expressShipping"}]'
        data-field-apple-pay-required-billing-contact-fields='["postalAddress","name"]'
        data-field-apple-pay-required-shipping-contact-fields='["postalAddress","name"]'
        data-field-apple-pay-contact-fields='["phone","email"]'
        data-field-apple-pay-contact-fields-mapped-to='shipping'
        data-field-apple-pay-line-items='[{"label":"Foobar","amount":"3.00"},{"label":"Arbitrary Line Item #2","amount":"1.00"}]'
        data-field-apple-pay-total-label='foobar'
        data-field-apple-pay-total-type='pending'
        data-field-apple-pay-type='buy'
        data-field-apple-pay-style-button-style='black'
        data-field-apple-pay-style-height='40px'
        data-field-apple-pay-style-border-radius='4px'
        data-field-apple-pay-is-recurring-transaction="true"
        data-field-apple-pay-recurring-payment-description="A description of the recurring payment to display to the user in the payment sheet."
        data-field-apple-pay-recurring-billing-agreement="A localized billing agreement displayed to the user in the payment sheet prior to the payment authorization."
        data-field-apple-pay-recurring-management-url="https://applepaydemo.apple.com"
        data-field-apple-pay-recurring-token-notification-url="https://applepaydemo.apple.com"
        data-field-apple-pay-recurring-label="Recurring"
        data-field-apple-pay-recurring-amount="4.99"
        data-field-apple-pay-recurring-payment-timing="recurring"
        data-field-apple-pay-recurring-recurring-payment-start-date="2023-08-11T11:20:32.369Z"
        data-field-apple-pay-recurring-recurring-payment-interval-unit="month"
        data-field-apple-pay-recurring-recurring-payment-interval-count="6"
        data-field-apple-pay-recurring-recurring-payment-end-date="2024-08-11T11:20:32.369Z"
></script>


```

## Configuration Variables

| **Variable** | **Format** | **Behavior** |
| --- | --- | --- |
| data-tokenization-key | String | Authenticates the request |
| data-variant | String ("inline" or "lightbox") | Whether to use "inline" or "lightbox" integration **(required for inline integration)**<br>**Default: "lightbox"** |
| data-payment-selector | String | Tells Collect.js what class or id value will trigger the form submission<br>**Default: "#payButton"** |
| data-style-sniffer | String ("true" or "false") | Whether Collect.js should try to calculate the style of form fields in your current form and use that as a baseline style for the Collect.js fields ("true" to calculate style, "false" to start with unstyled text fields)<br>**Default: "true"** |
| data-validation-callback | String | A JavaScript function which will be called each time a Collect.js field attempts to validate. It will recieve three paramaters: a string indicating which field was validated (ccnum or checkname, for example), a boolean for whether or not it validated successfully, and a string which may provide more detailed information about why the validation failed. For broadest compatibility, enclose the function in parentheses like in the example above |
| data-custom-css | JSON String | The CSS rules that will be applied to the fields by default. These override anything provided through the style-sniffer, if used. The rules should be packaged as a JSON-formatted object, containing a key-value pair for each property's name and value. Please see below for a list of the supported CSS properties |
| data-invalid-css | JSON String | The CSS rules that will be added to a field when it fails to validate. These override anything provided through the style-sniffer and the custom-css paramater, if used. The rules should be packaged as a JSON-formatted object, containing a key-value pair for each property's name and value. Please see below for a list of the supported CSS properties |
| data-placeholder-css | JSON String | The CSS rules that will be added to a field when it's displaying a placeholder. The rules should be packaged as a JSON-formatted object, containing a key-value pair for each property's name and value. Please see below for a list of the supported CSS properties |
| data-focus-css | JSON String | The CSS rules that will be added to a field when it has the keyboard focus. The rules should be packaged as a JSON-formatted object, containing a key-value pair for each property's name and value. Please see below for a list of the supported CSS properties |
| data-valid-css | JSON String | The CSS rules that will be added to a field when it successfully validates and saves. These override anything provided through the style-sniffer and the custom-css paramater, if used. The rules should be packaged as a JSON-formatted object, containing a key-value pair for each property's name and value. Please see below for a list of the supported CSS properties |
| data-google-font | String | Directs Collect.js to load font collections available through [Google Fonts](https://fonts.google.com/). This only makes the fonts available in the fields; you must still provide (either directly or through the style sniffer) styles that specify them. List the font name, followed by a colon and the specific weights or variants needed.<br>**Example: "Open Sans:400,700i"** |
| data-timeout-duration | Integer | When form submission is triggered, Collect.js will wait only this long (in milliseconds) for payment data validation and recording to complete. If, by this time, Collect.js is still missing confirmation on vital fields, the `data-timeout-callback` function will be invoked<br>**Default: "0" which disables the timeout** |
| data-timeout-callback | String | A JavaScript function which gets called if `data-timeout-duration` has passed since we tried to submit the form, but we still haven't confirmed that enough fields are stored with the token to make a viable payment. This allows for the site to retry submission, or ask the customer to try submission again, if an invalid entry or intermittent connection caused the data storage to fail. For broadest compatibility, enclose the function in parentheses like in the example above<br>**Default: an internal function that displays a "Please submit the form again." alert** |
| data-apple-pay-recurring-mismatch-callback | String | A JavaScript function that executes when the detected iOS version is below 16 or the macOS version is below 13, as these are the minimum versions required for Apple Pay recurring payments to function correctly.<br>**Default: an internal function that displays a "Please update your Apple Pay version." alert** |
| data-fields-available-callback | String | A JavaScript function which gets called once Collect.js has installed the fields onto your page. A typical use case is to wire up event handlers to the fields when they are enterred or left. For broadest compatibility, enclose the function in parentheses like in the example above |
| data-field-ccnumber-selector | String (CSS Selector) | A CSS selector for the Credit Card Number inline field<br>**Default: "#ccnumber"** |
| data-field-ccnumber-title | String | A title for the Credit Card Number inline field |
| data-field-ccnumber-placeholder | String | Placeholder text for the Credit Card Number inline field |
| data-field-ccnumber-enable-card-brand-previews | String ("true" or "false") | Determines whether or not the field will display a graphic depicting the credit card brand inside the field<br>**Default: "false"** |
| data-field-ccexp-selector | String (CSS Selector) | A CSS selector for the Credit Card Expiration Date inline field<br>**Default: "#ccexp"** |
| data-field-ccexp-title | String | A title for the Credit Card Expiration Date inline field |
| data-field-ccexp-placeholder | String | Placeholder text for the Credit Card Expiration Date inline field |
| data-field-cvv-display | String ("show", "hide", or "required") | Whether the CVV field is required ("required"), optional ("show"), or not displayed at all ("hide"). If the CVV field is required, a space for it must be provided on the form. Also supported as `data-field-cvv` for legacy users<br>**Default: "required"** |
| data-field-cvv-selector | String (CSS Selector) | A CSS selector for the CVV inline field<br>**Default: "#cvv"** |
| data-field-cvv-title | String | A title for the CVV inline field |
| data-field-cvv-placeholder | String | Placeholder text for the CVV inline field |
| data-field-checkaccount-selector | String (CSS Selector) | A CSS selector for Checking Account Number inline field<br>**Default: "#checkaccount"** |
| data-field-checkaccount-title | String | A title for the Checking Account Number inline field |
| data-field-checkaccount-placeholder | String | Placeholder text for the Checking Account Number inline field |
| data-field-checkaba-selector | String (CSS Selector) | A CSS selector for the Checking Routing Number inline field<br>**Default: "#checkaba"** |
| data-field-checkaba-title | String | A title for the Checking Routing Number inline field |
| data-field-checkaba-placeholder | String | Placeholder text for the Checking Routing Number inline field |
| data-field-checkname-selector | String (CSS Selector) | A CSS selector for the Checking Account Name inline field<br>**Default: "#checkname"** |
| data-field-checkname-title | String | A title for the Checking Account Name inline field |
| data-field-checkname-placeholder | String | Placeholder text for the Checking Account Name inline field |
| data-field-checktransit-selector | String (CSS Selector) | A CSS selector for the Check Transit inline field<br>**Default: "#checktransit"** |
| data-field-checktransit-title | String | A title for the Check Transit inline field |
| data-field-checktransit-placeholder | String | Placeholder text for the Check Transit inline field |
| data-field-checkinstitution-selector | String (CSS Selector) | A CSS selector for the Check Institution inline field<br>**Default: "#checkinstitution"** |
| data-field-checkinstitution-title | String | A title for the Check Institution inline field |
| data-field-checkinstitution-placeholder | String | Placeholder text for the Check Institution inline field |
| data-field-google-pay-selector | String | A CSS selector for the Google Pay field.<br>**Default: "#googlepaybutton"** |
| data-field-google-pay-shipping-address-required | String ("true" or "false") | Determines whether or not Google Pay should capture shipping address information. Shipping information captured this way becomes stored in the payment token.<br>**Default: "false"** |
| data-field-google-pay-shipping-address-parameters-phone-number-required | String ("true" or "false") | Determines whether or not Google Pay should capture a phone number from the user’s shipping phone number. Phone numbers captured this way become stored in the payment token.<br>**Default: "false"** |
| data-field-google-pay-shipping-address-parameters-allowed-country-codes | String (comma delimited list of 2 character country codes) | List of allowed countries. Credit cards from outside these countries will not be displayed as acceptable options within the Google Pay payment sheet. Omitting this value allows credit cards from any country.<br>**Default: undefined** |
| data-field-google-pay-billing-address-required | String ("true" or "false") | Determines whether or not Google Pay should capture billing address information. Billing information captured this way becomes stored in the payment token.<br>**Default: "false"** |
| data-field-google-pay-billing-address-parameters-phone-number-required | String ("true" or "false") | Determines whether or not Google Pay should capture a phone number from the user’s billing phone number. Phone numbers captured this way become stored in the payment token.<br>**Default: "false"** |
| data-field-google-pay-billing-address-parameters-format | String ("MIN" or "FULL") | Determines which billing address fields to capture from the user. "MIN" provides "zip", "country", "first\_name" and "last\_name". "FULL" additionally provides "address1", "address2", "city", "state". <br>**Default: "MIN"** |
| data-field-google-pay-email-required | String ("true" or "false") | Determines whether or not Google Pay should capture an email address. Email addresses captured this way becomes stored in the payment token.<br>**Default: "false"** |
| data-field-google-pay-button-type | String ("short", "long", "book", "buy", "checkout", "donate", "order", "pay", "plain", "subscribe", "short" or "long") | Determines the text that appears on the Google Pay button.<br>**Default: "buy"** |
| data-field-google-pay-button-locale | String ("en", "ar", "bg", "ca", "cs", "da", "de", "el", "es", "et", "fi", "fr", "hr", "id", "it", "ja", "ko", "ms", "nl", "no", "pl", "pt", "ru", "sk", "sl", "sr", "sv", "th", "tr", "uk", "zh) | The language that the button text appears in.<br>**Default: "en" (English)** |
| data-field-google-pay-button-color | String ("default", "black", "white") | The color to display the Google Pay button. "Default" allows Google to determine the color.<br>**Default: "default"** |
| data-field-google-pay-total-price-status | String ("FINAL" or "ESTIMATED") | The status of the total price being used.<br>"FINAL" should be used when the amount is not expected to change.<br>"ESTIMATED" should be used when the amount might change based on upcoming factors such as sales tax based on billing address.<br>**Default: "FINAL"** |
| data-field-apple-pay-selector | String (CSS Selector) | A CSS selector for the Apple Pay field.<br>**Default: "#applepaybutton"** |
| data-field-apple-pay-shipping-type | String ("shipping", "delivery", "storePickup", or "servicePickup") | The way purchases will be sent to the customer. For transactions that do not need to be sent to a customer, omit data-field-apple-pay-required-shipping-contact-fields.<br>**Default: "shipping"** |
| data-field-apple-pay-shipping-methods | String (JSON array of objects) | The shipping information that appears on the payment sheet. Example: '\[{"label":"Free Standard Shipping","amount":"0.00","detail":"Arrives in 5-7 days","identifier":"standardShipping"}\]'<br>**Default: "\[\]"** |
| data-field-apple-pay-required-billing-contact-fields | String (JSON array of "name" or "postalAddress") | When "name" or "postalAddress" is provided, the payment sheet will collect a customer's name or address. These values will be included with the transaction's billing information. Example:'\["name","postalAddress"\]'<br>**Default: "\[\]"** |
| data-field-apple-pay-required-shipping-contact-fields | String (JSON array of "name" or "postalAddress") | When "name" or "postalAddress" is provided, the payment sheet will collect a customer's name or address. These values will be included with the transaction's shipping information. Example:'\["name","postalAddress"\]'<br>**Default: "\[\]"** |
| data-field-apple-pay-contact-fields | String (JSON array of "phone" or "email") | When "phone" or "email" is provided, the payment sheet will collect a customer's phone number or email address. Usage of this data is determined by the data-field-apple-pay-contact-fields-mapped-to value. Example: '\["phone","email"\]'<br>**Default: "\[\]"** |
| data-field-apple-pay-contact-fields-mapped-to | String ("billing" or "shipping") | "billing" causes data collected via the data-field-apple-pay-contact-fields options to be included in a transactions "phone" and "email" values. "shipping" causes them to be included as "shipping\_phone", "shipping\_email".<br>**Default: "billing"** |
| data-field-apple-pay-line-items | String (JSON array of objects) | Items that will appear in the Apple Pay payment sheet. Example: \[{"label":"Foobar","amount":"3.00"}\]<br>**Default: "\[\]"** |
| data-field-apple-pay-total-label | String | Text that appears next to the final amount in the Apple Pay payment sheet.<br>**Default: "Total"** |
| data-field-apple-pay-total-type | String ("pending" or "final") | A value that indicates whether the total is final or pending. When set to "pending" the customer will see "Amount Pending" on the ApplePay checkout form instead of a total amount.<br>**Default: "final"** |
| data-field-apple-pay-type | String ("buy", "donate",<br> "plain", "set-up", "book", "check-out", "subscribe", "add-money", "contribute",<br> "order", "reload", "rent", "support", "tip", or "top-up") | The text that appears on an Apple Pay button. Some options are only supported by newer versions of iOS and macOS.<br> <br>**Default: "buy"** |
| data-field-apple-pay-style-button-style | String ("black", "white", or "white-outline") | The appearance of the Apple Pay button.<br>**Default: "black"** |
| data-field-apple-pay-style-height | String | The height of the Apple Pay button.<br>**Default: "30px"** |
| data-field-apple-pay-style-border-radius | String | The rounding of the corners on the Apple Pay button.<br>**Default: "4px"** |
| data-field-apple-pay-is-recurring-transaction | String ("true" or "false") | Marks the Apple Pay transaction as a recurring transaction. **Default: "false"** |
| data-field-apple-pay-recurring-payment-description | String | A description of the recurring payment to display to the user in the payment sheet. Value of data-field-apple-pay-is-recurring-transaction must be true in order to use. Required for recurring. <br>**Example:** "Monthly subscription for premium features." <br>**Default:** "" |
| data-field-apple-pay-recurring-billing-agreement | String | A localized billing agreement displayed to the user prior to payment authorization. Value of data-field-apple-pay-is-recurring-transaction must be true in order to use. Optional. <br>**Example:** "By subscribing, you agree to the terms and conditions." <br>**Default:** "" |
| data-field-apple-pay-recurring-label | String | The label for the recurring payment. Example: "Recurring". <br> Value of **data-field-apple-pay-is-recurring-transaction** must be **true** in order to use. |
| data-field-apple-pay-recurring-amount | String (Decimal) | The amount to be charged for the recurring payment. Example: "4.99". <br> Value of **data-field-apple-pay-is-recurring-transaction** must be **true** in order to use. |
| data-field-apple-pay-recurring-payment-timing | String | The timing of the recurring payment. Example: "recurring". <br> Value of **data-field-apple-pay-is-recurring-transaction** must be **true** in order to use. |
| data-field-apple-pay-recurring-payment-start-date | String (ISO 8601 Datetime) | The start date of the recurring payment. Example: "2023-08-11T11:20:32.369Z". <br> Value of **data-field-apple-pay-is-recurring-transaction** must be **true** in order to use. |
| data-field-apple-pay-recurring-payment-interval-unit | String | The unit of time for the recurring payment interval. Possible values: "day", "week", "month", "year". Example: "month". <br> Value of **data-field-apple-pay-is-recurring-transaction** must be **true** in order to use. |
| data-field-apple-pay-recurring-payment-interval-count | Integer | The number of units per payment interval. Example: 6. <br> Value of **data-field-apple-pay-is-recurring-transaction** must be **true** in order to use. |
| data-field-apple-pay-recurring-payment-end-date | String (ISO 8601 Datetime) | The end date of the recurring payment. Example: "2024-08-11T11:20:32.369Z". <br> If this field is omitted, the recurring transaction will continue until canceled. |
| data-field-apple-pay-recurring-management-url | String | A URL to the merchant's management portal where users can manage their subscriptions. Value of data-field-apple-pay-is-recurring-transaction must be true in order to use this field. Required for recurring. <br>**Example:** "https://example.com/manage-tokens" <br>**Default:** "" |
| data-field-apple-pay-recurring-token-notification-url | String | A URL where tokenization events (e.g., token refresh, expiration) are sent. Value of data-field-apple-pay-is-recurring-transaction must be true in order to use this field. Optional. <br>**Example:** "https://example.com/token-notify" <br>**Default:** "" |
| data-field-apple-pay-vault-up-front-price | String (Decimal) | If set, the Apple Pay request will switch from a "recurring" format to an "automatic reload" format with this amount charged up front. The recurring amount, label, description, billing agreement, management URL, and token notification URLs are still required for this request. After Collect.js completes, the vault or subscription request made to the Payment API should contain this value in an "amount" field and a "type" of "sale" or "auth" to trigger the requested up-front transaction.<br>**Example:** "6.00" <br>**Default:** "" |
| data-field-apple-pay-recurring-up-front-price | String (Decimal) | If set, the Apple Pay recurring request will charge this amount immediately, rather than using a $0 authorization to validate the information when the subscription is saved. After Collect.js completes, the subscription request made to the Payment API should contain the same value in an "amount" field and a "type" of "sale" or "auth" to trigger the requested up-front transaction.<br>**Example:** "6.00" <br>**Default:** "" |
| data-price | String | The final cost that the user will be charged.<br>**Default: undefined**<br>**Required if using Apple Pay** |
| data-country | String | The country where the transaction is processed.<br>**Required if using Google Pay or Apple Pay** |
| data-currency | String | The currency the transaction will use to process the transaction.<br>**Required if using Google Pay or Apple Pay** |

## Collect.js Functions

| Function Name | Parameters | Description |
| --- | --- | --- |
| configure | Object | Call this when you’d like to reconfigure Collect.js. Collect.js will try to run this automatically on page load, but you can run it manually to change the configuration at any time. This will draw or re-draw all iframes onto the page.<br>This method optionally accepts an object with all configuration variables you’re using for Collect.js. |
| startPaymentRequest | Event | Call this when you want to save the data in the iframes and get the token value in the callback.<br>This method accepts an event object as an optional parameter. It will call the provided callback function with a token response and the optional event. |
| clearInputs |  | Call this when you want to clear whatever the user has entered into any input provided by Collect.js. |

## JavaScript Based Activation

You may also choose to configure Collect.js directly in your JavaScript, For this, you will typically only include the `data-tokenization-key` parameter in the script tag, and deploy the other options with a `CollectJS.configure()` call. See the [Advanced Inline JavaScript Example](https://secure.easypaydirectgateway.com/merchants/resources/integration/integration_portal.php#cjs_example_inline2_js) for a demonstration with the main available options.

The `CollectJS.configure` function also lets you specify a `callback` function that will execute when the customer submits the payment form and payment info has been successfully stored. The callback takes the place of the default "add the payment token and submit the form" behavior and gets passed a "response" variable with the Payment Token. It is your responsibility to ensure this is posted to your server.

`
`

```vbscript
{
	tokenType: "inline",
	token:"3455zJms-7qA2K2-VdVrSu-Rv7WpvPuG7s8",
	initiatedBy: Event,
	card:{
		number: "411111******1111",
		bin: "411111",
        exp: "1028",
        hash: "abcdefghijklmnopqrstuv1234567890",
		type: "visa"
	},
	check:{
		name:null,
		account:null,
		hash:null,
		aba:null,
		transit:null,
		institution:null
	},
	wallet: {
		cardDetails: null,
		cardNetwork: null,
		email: null,
		billingInfo: {
			address1: null,
			address2: null,
			firstName: null,
			lastName: null,
			postalCode: null,
			city: null,
			state: null,
			country: null,
			phone: null

		},
		shippingInfo: {
			address1: null,
			address2: null,
			firstName: null,
			lastName: null,
			postalCode: null,
			city: null,
			state: null,
			country: null,
			phone: null
		}

	}
}

```

`
`

## Styling Limitations

For security and compatibility reasons, the styling system- whether provided via `custom-css`, `invalid-css`, `valid-css`, `focus-css` or calculated using the style-sniffer, only supports the following CSS properties:

- background-color
- border-bottom-color
- border-bottom-left-radius
- border-bottom-right-radius
- border-bottom-style
- border-bottom-width
- border-left-color
- border-left-style
- border-left-width
- border-right-color
- border-right-style
- border-right-width
- border-top-color
- border-top-left-radius
- border-top-right-radius
- border-top-style
- border-top-width
- border-width
- border-style
- border-radius
- border-color
- bottom
- box-shadow
- color
- cursor
- direction
- font-family
- font-kerning
- font-size
- font-stretch
- font-style
- font-variant-caps
- font-variant-numeric
- font-weight
- height
- letter-spacing
- line-height
- margin-top
- margin-bottom
- opacity
- outline-color
- outline-offset
- outline-style
- outline-width
- padding
- padding-bottom
- padding-left
- padding-right
- padding-top
- pointer-events
- text-align
- text-align-last
- text-decoration
- text-decoration-line
- text-decoration-style
- text-decoration-color
- text-decoration-skip-ink
- text-underline-position
- text-indent
- text-rendering
- text-shadow
- text-size-adjust
- text-overflow
- text-transform
- transition
- vertical-align
- white-space
- will-change
- word-break
- word-spacing
- hyphens

Placeholder CSS can only use the following attributes

- background-color
- font-family
- font-kerning
- font-size
- font-stretch
- font-style
- font-variant-caps
- font-variant-numeric
- font-weight
- word-spacing
- letter-spacing
- line-height
- text-decoration
- text-indent
- text-transform
- transition
- vertical-align
- opacity
- color

Any other CSS properties will be ignored.

# Expert Inline Implementation

## Understanding the lifecycle of a Collect.js-enabled form

Each field that Collect.js supplies communicates with your Gateway independently. These fields will check the payment information, and if valid, direct the Gateway to save it, as soon as the customer exits a field. This process triggers the validation callbacks you can use to monitor the user's progress and control their interactions with your form.

When the submit button is pressed (or `CollectJS.startPaymentRequest` is manually called), Collect.js directs each field to validate and save one last time. Once it gets back a notice of successful validation and saving from enough fields to make a viable payment request, it proceeds to submit the form or call an alternative `callback` as configured.

Once the Payment Token is used in a Payment API request, it's automatically destroyed. This prevents its reuse for a later unauthorized charge, but means that if you have to collect the payment information again (for example, after a declined transaction), you're going to have to start fresh and generate a new token.

## Manually Triggering Payment Information Saving

You can take control of when the final validate-and-save process is triggered. Rather than binding it explicitly to a payment button, you can call the following JavaScript function when ready.

```

CollectJS.startPaymentRequest(event)


```

When triggered, this causes the same behavior as pressing a payment button does by default: all the fields are told to validate and save. Once we confirm all data is stored, the callback you configured is executed.

This function optionally receives an event object. If an event is passed into the startPaymentRequest function, that same event will exist in the callback's response variable under "response.initiatedBy". This can be used to track what event started the recording request and the next steps.

`
`

```vbscript
{
	tokenType: "inline",
	token:"3455zJms-7qA2K2-VdVrSu-Rv7WpvPuG7s8",
	initiatedBy: Event,
	card:{
		number: "411111******1111",
		bin: "411111",
        exp: "1028",
        hash: "abcdefghijklmnopqrstuv1234567890",
		type: "visa"
	},
	check:{
		name:null,
		account:null,
		hash:null,
		aba:null,
		transit:null,
		institution:null
	},
	wallet: {
		cardDetails: null,
		cardNetwork: null,
		email: null,
		billingInfo: {
			address1: null,
			address2: null,
			firstName: null,
			lastName: null,
			postalCode: null,
			city: null,
			state: null,
			country: null,
			phone: null

		},
		shippingInfo: {
			address1: null,
			address2: null,
			firstName: null,
			lastName: null,
			postalCode: null,
			city: null,
			state: null,
			country: null,
			phone: null
		}

	}
}

```

`
`

Note that this implementation also requires you to include the standard script tag on the page as well.

_**The [expert example](https://secure.easypaydirectgateway.com/gw/merchants/resources/integration/integration_portal.php#cjs_example_inline2) shows how the process can be triggered in code.**_

## Integration with form validation

While Collect.js doesn't let you directly access the contents of the payment information fields, it does provide several ways to check if they contain _valid_ content. There are two distinct ways you can access this information in your form validation code:

#### 1\. Supply a "validation-callback"

This will listen for all Collect.js validation changes. This function will get a notice about each field change, and you can keep a tally during the form's life.

```http


<script
        src="https://secure.easypaydirectgateway.com/token/Collect.js"
        data-tokenization-key="your-token-key-here"
        data-validation-callback="(
            function(fieldName, valid, message) {
                if (valid) {
                     ... store the fact that fieldName is valid ...
                } else {
                     ... remove fieldName from the valid list, maybe display message to the user ...
                }
            }
        )">


```

#### 2\. Check CSS classes.

When you start the validation process, you can see if the elements you loaded Collect.js fields into have either `CollectJSValid` or `CollectJSInvalid` elements within them. Note that blank fields, or some fields in the process or being edited or saved, will have neither set. You can decide how to handle these depending on when you're performing the check, what field is blank or unsaved, and how that fits into your site's flow.

```ini

validCardNumber = document.querySelector("#ccnumber .CollectJSValid") !== null;
validExpiration = document.querySelector("#ccexp .CollectJSValid") !== null;
validCvv = document.querySelector("#cvv .CollectJSValid") !== null;
invalidCvv = document.querySelector("#cvv .CollectJSInvalid") !== null;
blankOrUnsavedCvv = !validCvv && !invalidCvv;


```

## Blur and Focus Events

Some styling techniques will change the classes of related elements as a user enters and leaves a form field. Google's [Material Design Components for the Web](https://material.io/) is a typical example-- the label moves above the text, and an underline that's not part of the field changes color. Collect.js exposes `focus` and `blur` events that can be used to trigger these types of effects with Collect.js fields.

Here's a tangible example. The `data-fields-available-callback` code adds a listener to each Collect.js field's `blur` and `focus` events. This listener adds or removes the `active` class from the nearest label. When a user enters the field, the label next to it changes from gray to bold and blue, reverting once they leave the field.

```applescript

<script
        src="https://secure.easypaydirectgateway.com/token/Collect.js"
        data-tokenization-key="your-token-key-here"
        data-variant="inline"
        data-fields-available-callback='
                (function() {
                    var frames = document.querySelectorAll(".input-field iframe.CollectJSInlineIframe")
                    for (var i = 0; i < frames.length; i++) {
                        frames[i].addEventListener("focus", function (event) {
                            var panel = event.target.parentNode.parentNode;
                            panel.querySelector("label").classList.add("active");
                        });
                        frames[i].addEventListener("blur", function (event) {
                            var panel = event.target.parentNode.parentNode;
                            if(event.detail && event.detail.empty) {
                                panel.querySelector("label").classList.remove("active");
                            }
                        });
                    }
                });'
></script>

<style>
    label {
        color: gray;
    }
    label.active {
        color: blue;
        font-weight: bold;
    }
</style>

<div class="input-field">
    <label for="ccnumber">Card Number</label>
    <div id="ccnumber"></div>
</div>
<div class="input-field">
    <label for="ccexp">Expiration Date</label>
    <div id="ccexp"></div>
</div>
<div class="input-field">
    <label for="cvv">CVV</label>
    <div id="cvv"></div>
</div>


```

When the `blur` event is fired, it will include a `detail` structure with one element: `empty`. This tells you if the field is blank, so you can style it differently, without disclosing its contents.

# Google Pay

![](https://secure.easypaydirectgateway.com/shared/images/google-pay-mark.png)

Google Pay allows customers to provide credit card data saved in their Google accounts to be used in online payments. Collect.js supports Google Pay in both lightbox and inline integrations allowing you to capture these credit card details in either flow. And to make the integration as seamless as possible, the Google Pay data will be returned to you in the "payment\_token" variable, so no matter what payment method your customers make, your transaction request can be exactly the same. Google Pay data can be used for single transactions, stored to the Customer Vault, or used to initiate a recurring payment.

To use Google Pay, you must provide Collect.js country and currency values. These values are used to ensure the user can only select a valid card. You must also provide an HTML element on your page that Collect.js can use to draw the Google Pay button.

Google Pay is currently supported on TSYS - EMV and Elavon viaConex.

```xml
                <html>
    <head>
        <script
            src="https://secure.easypaydirectgateway.com/token/Collect.js"
            data-tokenization-key="000000-000000-000000-000000"
            data-variant="inline"
            data-country="US"
            data-price="1.00"
            data-currency="USD"
        ></script>
    </head>
    <body>
        <form action="submit_to_direct_post_api.php" method="post">
            <div id="googlepaybutton"></div>
        </form>
    </body>
</html>

```

This will create a Google Pay button that will be inserted in the div as an iframe. The Google Pay button will be 240x70px, so make sure to leave room in this div for the button to display in full. When a user clicks the button, they are presented with a payment sheet requesting the user’s payment details. After the user submits the payment sheet, Collect.js executes the callback function if one were provided, or submits your form with the payment token attached.

## Capture Billing and Shipping Data

Collect.js also allows you to capture the user’s shipping and billing details with Google Pay, just like the credit card data. This eliminates the need for you to capture this manually in your own web form. When these options are enabled, Google Pay will also request the user’s information and Collect.js will store all that data in the payment token.

In addition to the payment data that gets stored for all Google Pay transactions, the payment token will include the following shipping fields when shipping address required is enabled:

- shipping\_address\_1
- shipping\_address\_2
- shipping\_zip
- shipping\_city
- shipping\_state
- shipping\_country
- shipping\_firstname
- shipping\_lastname
- phone (also requires phone\_number\_required to be enabled)

When billing\_address\_required is enabled, Collect.js will also capture these fields:


- address1 (also requires format to be "FULL")
- address2 (also requires format to be "FULL")
- zip
- city (also requires format to be "FULL")
- state (also requires format to be "FULL")
- country
- firstname
- lastname
- phone (also requires phone\_number\_required to be enabled)

```xml
                <html>
    <head>
        <script
            src="https://secure.easypaydirectgateway.com/token/Collect.js"
            data-tokenization-key="000000-000000-000000-000000"
            data-variant="inline"
            data-field-google-pay-selector=".google-pay-button"
            data-field-google-pay-shipping-address-required="true"
            data-field-google-pay-shipping-address-parameters-phone-number-required="true"
            data-field-google-pay-shipping-address-parameters-allowed-country-codes="US,CA"
            data-field-google-pay-billing-address-required="true"
            data-field-google-pay-billing-address-parameters-phone-number-required="true"
            data-field-google-pay-billing-address-parameters-format="MIN"
        ></script>
    </head>
    <body>
        <form action="submit_to_direct_post_api.php" method="post">
            <div class="google-pay-button"></div>
        </form>
    </body>
</html>

```

```vbscript

{
	tokenType: "googlePay",
	token: "3455zJms-7qA2K2-VdVrSu-Rv7WpvPuG7s8",
	initiatedBy: Event,
	card:{
		number: null,
		bin: null,
        exp: null,
        hash: null,
		type: "visa"
	},
	check:{
		name:null,
		account:null,
		hash:null,
		aba:null,
		check:null,
		institution:null
	},
	wallet: {
		cardDetails: "1234",
		cardNetwork: "visa",
		email: "email@example.com",
		billingInfo: {
			address1: "123 Happy Ln",
			address2: "APT 1",
			firstName: "Jane",
			lastName: "Doe",
			postalCode: "12345",
			city: "Cooltown",
			state: "AZ",
			country: "US",
			phone: "1234567890"

		},
		shippingInfo: {
			address1: "123 Happy Ln",
			address2: "APT 1",
			firstName: "Jane",
			lastName: "Doe",
			postalCode: "12345",
			city: "Cooltown",
			state: "AZ",
			country: "US",
			phone: "1234567890"
		}

	}
}


```

# Apple Pay

![](https://secure.easypaydirectgateway.com/shared/images/apple_pay_header.jpg)

Apple Pay allows merchants to accept payments from their customers with little friction and high conversion rates. For most customers using Apple devices, it’s the preferred payment method when shopping online.

Using Collect.js, merchants can add Apple Pay into their websites with ease. Whether using the Lightbox or Inline integration methods, Apple Pay can be added in no time at all. And to make the integration as seamless as possible, the Apple Pay data will be returned to you in the "payment\_token" variable, so no matter what payment method your customers make, your transaction request can be exactly the same. Apple Pay data can be used for single transactions, stored to the Customer Vault, or used to initiate a recurring payment.

**Apple Pay supports Global Payments East - EMV, Test CC Processor, First Data Nashville, Chase Paymentech Salem, Chase Paymentech Tampa, EPX, Vantiv Now Worldpay eCommerce - Host Capture (Litle & Co), Global Payments Canada, First Data Nashville North, Vantiv Now Worldpay Core - Terminal Capture, Paymentech Salem Dev, Vantiv Now Worldpay eCommerce - Terminal Capture (Litle & Co.), First Data Nashville North V2, FACe - Vantiv Pre-Live, FACe - Vantiv, First Data Compass, TSYS - EMV, Credomatic Web Service, Credomatic Web Service Dev, First Data Rapid Connect Nashville North - EMV, First Data Rapid Connect Cardnet North - EMV, First Data Rapid Connect Nashville - EMV, FACe - Vantiv (Next Day Funding), Elavon viaConex, First Data Rapid Connect Omaha - EMV, Elavon EISOP UK/EU - EMV, American Express Direct UK/EU - EMV, Credorax ePower EU - EMV, Worldpay APACS UK/EU - EMV, First Data APACS UK/EU - EMV, Lloyds Cardnet APACS UK/EU - EMV, Barclaycard HISO UK/EU - EMV, AIBMS APACS UK/EU - EMV, Global Payments APACS UK/EU - EMV, Checkout.com Unified Payments, NMI Payments and FACe - Worldpay Core processors configured for e-commerce.**

Setting Up Apple Pay for Collect.js and Collect Checkout from Gateway Services on Vimeo

![video thumbnail](https://i.vimeocdn.com/video/1093801141-4d0e83d493726f523a6a7bf9395d81db574d96b6c540b792b8fd783962c7c0e9-d?mw=80&q=85)

Playing in picture-in-picture

Like

Add to Watch Later

Share

Play

00:00

05:06

Settings

QualityAuto

SpeedNormal

Picture-in-PictureFullscreen

[Watch on Vimeo](https://vimeo.com/528459281?fl=pl&fe=vl)

To use Apple Pay, you must provide Collect.js price, country, and currency values. These values are used to ensure the user can only select a valid card. You must also provide an HTML element on your page that Collect.js can use to draw the Apple Pay button.

```xml
                <html>
    <head>
        <script
            src="https://secure.easypaydirectgateway.com/token/Collect.js"
            data-tokenization-key="000000-000000-000000-000000"
            data-variant="inline"
            data-country="US"
            data-price="1.00"
            data-currency="USD"
        ></script>
    </head>
    <body>
        <form action="submit_to_direct_post_api.php" method="post">
            <div id="applepaybutton"></div>
        </form>
    </body>
</html>

```

This will create an Apple Pay button that will be inserted in the div. When a user clicks the button, they are presented with a payment sheet requesting the user’s payment details. After the user submits the payment sheet, Collect.js executes the callback function if one were provided, or submits your form with the payment token attached.

## Uploading the Domain Verification File

Apple requires merchants to upload the gateway’s Domain Verification File to your server to use Apple Pay. You can download the file and add your website to the “Allowed Domains” on your account from the merchant control panel’s Apple Pay settings page. In short, you need to:

1. Download the verification file
2. Upload the verification file to the .well-known directory on your web server
3. Add your domain to the list of domains allowed to use Apple Pay

Once these steps are complete, Apple Pay will be able to work with Collect.js.

## Capture Billing and Shipping Data

Collect.js also allows you to capture the user’s shipping and billing details with Apple Pay, just like the credit card data. This eliminates the need for you to capture this manually in your own web form. When these options are enabled, Apple Pay will also request the user’s information and Collect.js will store all that data in the payment token.

**Please note that Apple Pay tokens are one-time use tokens and should not be saved to the Customer Vault. They will not be able to be charged again.**
We currently suggest not using Apple Pay in checkout flows where you are also saving customers to the Vault.

When data-field-apple-pay-required-billing-contact-fields includes "postalAddress", the following data is included in the payment token:

- address1
- address2
- state
- country
- city
- zip

When data-field-apple-pay-required-billing-contact-fields includes "name", the following data is included in the payment token:

- first\_name
- last\_name

When data-field-apple-pay-required-shipping-contact-fields includes "postalAddress", the following data is included in the payment token:

- shipping\_address\_1
- shipping\_address\_2
- shipping\_state
- shipping\_country
- shipping\_city
- shipping\_zip

When data-field-apple-pay-required-shipping-contact-fields includes "postalAddress", the following data is included in the payment token:

- shipping\_firstname
- shipping\_lastname

When data-field-apple-pay-contact-fields includes "phone" and data-field-apple-pay-contact-fields-mapped-to is "billing", the following data is included in the payment token:

- phone

When data-field-apple-pay-contact-fields includes "phone" and data-field-apple-pay-contact-fields-mapped-to is "shipping", the following data is included in the payment token:

- shipping\_phone

When data-field-apple-pay-contact-fields includes "email" and data-field-apple-pay-contact-fields-mapped-to is "billing", the following data is included in the payment token:

- email

When data-field-apple-pay-contact-fields includes "email" and data-field-apple-pay-contact-fields-mapped-to is "shipping", the following data is included in the payment token:

- shipping\_email

Below is an example of an Apple Pay integration in Collect.js with all available configuration options:

```applescript
                <html>
    <head>
        <script
            src="https://secure.easypaydirectgateway.com/token/Collect.js"
            data-tokenization-key='000000-000000-000000-000000'
            data-variant='inline'
            data-field-apple-pay-selector='.apple-pay-button'
            data-field-apple-pay-shipping-type='delivery'
            data-field-apple-pay-shipping-methods='[{"label":"Free Standard Shipping","amount":"0.00","detail":"Arrives in 5-7 days","identifier":"standardShipping"},{"label":"Express Shipping","amount":"10.00","detail":"Arrives in 2-3 days","identifier":"expressShipping"}]'
            data-field-apple-pay-required-billing-contact-fields='["postalAddress","name"]'
            data-field-apple-pay-required-shipping-contact-fields='["postalAddress","name"]'
            data-field-apple-pay-contact-fields='["phone","email"]'
            data-field-apple-pay-contact-fields-mapped-to='shipping'
            data-field-apple-pay-line-items='[{"label":"Foobar","amount":"3.00"},{"label":"Arbitrary Line Item #2","amount":"1.00"}]'
            data-field-apple-pay-total-label='Total'
            data-field-apple-pay-type='buy'
            data-field-apple-pay-style-button-style='white-outline'
            data-field-apple-pay-style-height='30px'
            data-field-apple-pay-style-border-radius='4px'
            data-field-apple-pay-is-recurring-transaction="true"
            data-field-apple-pay-recurring-payment-description="A description of the recurring payment to display to the user in the payment sheet."
            data-field-apple-pay-recurring-billing-agreement="A localized billing agreement displayed to the user in the payment sheet prior to the payment authorization."
            data-field-apple-pay-recurring-management-url="https://applepaydemo.apple.com"
            data-field-apple-pay-recurring-token-notification-url="https://applepaydemo.apple.com"
            data-field-apple-pay-recurring-label="Recurring"
            data-field-apple-pay-recurring-amount="4.99"
            data-field-apple-pay-recurring-payment-timing="recurring"
            data-field-apple-pay-recurring-recurring-payment-start-date="2023-08-11T11:20:32.369Z"
            data-field-apple-pay-recurring-recurring-payment-interval-unit="month"
            data-field-apple-pay-recurring-recurring-payment-interval-count="6"
            data-field-apple-pay-recurring-recurring-payment-end-date="2024-08-11T11:20:32.369Z"
        ></script>
    </head>
    <body>
        <form action="submit_to_direct_post_api.php" method="post">
            <div class="apple-pay-button"></div>
        </form>
    </body>
</html>

```

```vbscript

{
	tokenType: "applePay",
	token: "3455zJms-7qA2K2-VdVrSu-Rv7WpvPuG7s8",
	initiatedBy: Event,
	card:{
		number: null,
		bin: null,
        exp: null,
        hash: null,
		type: "visa"
	},
	check:{
		name:null,
		account:null,
		hash:null,
		aba:null,
		check:null,
		institution:null
	},
	wallet: {
		cardDetails: "1234",
		cardNetwork: "visa",
		email: "email@example.com",
		billingInfo: {
			address1: "123 Happy Ln",
			address2: "APT 1",
			firstName: "Jane",
			lastName: "Doe",
			postalCode: "12345",
			city: "Cooltown",
			state: "AZ",
			country: "US",
			phone: "1234567890"

		},
		shippingInfo: {
			address1: "123 Happy Ln",
			address2: "APT 1",
			firstName: "Jane",
			lastName: "Doe",
			postalCode: "12345",
			city: "Cooltown",
			state: "AZ",
			country: "US",
			phone: "1234567890"
		}

	}
}


```

_Note:_
Collect.JS defaults to building recurring Apple Pay payments with a $0 up-front amount. This enables use of a $0 authorization to validate and set up the payment info during the subscription registration process, while deferring the first real payment to the given start date.

# Getting Started

Gateway.js is a JavaScript library that allows merchants to highly customize their integration with the
gateway's services. To start using Gateway.js, you need to load the library with a
<script> tag.

`
<script src="https://secure.easypaydirectgateway.com/js/v1/Gateway.js"></script>
`

The script tag must load from the payment gateway. You should not attempt to host the file and load it
from your own domain.

Including this script will expose the Gateway class that can be used to
initialize access to other services.

Next, you will need to create a public key from the merchant portal. On the [Security Keys](https://secure.easypaydirectgateway.com/merchants/options.php?Action=Keys) page
you will need to click “Add a New Public Key”. The new key should have the Checkout permission attached to it.

Provide the created key to Gateway.create to initialize the library.

`
            const gateway = Gateway.create('collect_checkout_0000000000000000000000');
`

# Services

- [3-D Secure](https://secure.easypaydirectgateway.com/gw/merchants/resources/integration/integration_portal.php#gjs_gettingStarted)
- [Kount](https://secure.easypaydirectgateway.com/gw/merchants/resources/integration/integration_portal.php#gjs_kount_gettingStarted)

# 3-D Secure

3-D Secure can help you avoid fraudulent transactions by authenticating transactions before submitting them
to the gateway for processing. When a credit card enrolled in 3-D Secure is submitted it will
ensure that the customer is the owner of the credit card. Their bank will first collect a fingerprint
of their device. On some occasions, this fingerprint is sufficient and the customer is immediately
authenticated. This flow is often called "frictionless" because it does not require additional inputs from
the user and does not interrupt the customer's checkout flow. On other occasions, the bank will issue a
challenge to the customer requiring them to submit a password or other information to validate themselves.
This flow is often called "step up authentication".

## 3-D Secure Variables

When a customer successfully authenticates a transaction, the library may provide you the following,
which you should submit to the payment API:

| Variable | Description | When Received |
| --- | --- | --- |
| cavv | Cardholder Authentication Verification Value <br>The value that signifies that a customer was successfully authenticated. | On all successful authentications |
| xid | A transaction identifier from authentication processing | Occasionally provided for some card brands |
| directory\_server\_id | A transaction identifier assigned by the directory server. | On all successful 3DS2 authentications |
| eci | A number that indicates the result of the attempt to authenticate the cardholder. Values are<br> dependent on the card brand. | On successful authentications |
| cardholder\_auth | A string describing if a customer was successfully verified or attempted. <br>"verified" indicates that a cardholder's bank successfully verified the user. <br>"attempted" indicates that a cardholder is enrolled in 3DS, but their bank does not support 3DS. <br>Examples: verified, attempted | On successful authentications |
| three\_ds\_version | Determines which version of 3DS was used. <br>Examples: 1.0.2, 2.1.0, 2.2.0 | On all successful authentications |
| cardholder\_info\* | Text provided by the ACS/Issuer to Cardholder. <br>Example: Additional authentication is needed for this transaction, please contact (Issuer Name) at xxx-xxx-xxxx. | Occasionally provided for frictionless transactions |

\\* cardholder\_info should not be passed into the API and should be displayed to the customer if a value is present.

## Handling in Gateway.js

Using Collect.js or Customer Vault? See ["Running 3DS with Collect.js"](https://secure.easypaydirectgateway.com/merchants/resources/integration/integration_portal.php#gjs_guides_collectJs) or ["Running 3DS with Customer Vault"](https://secure.easypaydirectgateway.com/merchants/resources/integration/integration_portal.php#gjs_guides_customerVault)
guides for information about integrating with other gateway services.

**example.html**

```xml
<html>
    <body>
    <script src="https://secure.easypaydirectgateway.com/js/v1/Gateway.js"></script>
    <script>
        // Initialize Gateway.js
        const gateway = Gateway.create('collect_checkout_0000000000000000000000');

        // Initialize the ThreeDSService
        const threeDS = gateway.get3DSecure();

        // Create a 3DS Frame
        // This will start out 0px x 0px during fingerprinting.
        // If the customer is prompted to complete a challenge, it will resize automatically.
        const options = {
            cardNumber: "4111111111111111",
            cardExpMonth: "01",
            cardExpYear: "2024",
            currency: 'USD',
            amount: '10.00',
            email: 'none@example.com',
            phone: '8008675309',
            city: 'New York',
            state: 'NY',
            address1: '123 First St.',
            country: 'US',
            firstName: 'Jane',
            lastName: 'Doe',
            postalCode: '60001'
        };

        const threeDSecureInterface  = threeDS.createUI(options);

        // Mount the threeDSecureInterface to the DOM
        // This begins the collection of 3DS data.
        threeDSecureInterface.start('body');

        // Listen for the threeDSecureInterface to ask the user for a password
        threeDSecureInterface.on('challenge', function(e) {
            console.log('Challenged');
        });

        // Listen for the threeDSecureInterface to provide all the needed 3DS data
        threeDSecureInterface.on('complete', function(e) {
            fetch('direct-post-back-end.php', {
                method: 'POST',
                body: JSON.stringify({
                    ...options,
                    cavv: e.cavv,
                    xid: e.xid,
                    eci: e.eci,
                    cardHolderAuth: e.cardHolderAuth,
                    threeDsVersion: e.threeDsVersion,
                    directoryServerId: e.directoryServerId,
                    cardHolderInfo: e.cardHolderInfo,
                })
            })
        });

        // Listen for the threeDSecureInterface to indicate that the customer
        // has failed to authenticate
        threeDSecureInterface.on('failure', function(e) {
            console.log('failure');
            console.log(e);
        });

        // Listen for any errors that might occur.
        gateway.on('error', function (e) {
            console.error(e);
        })
    </script>
    </body>
</html>
```

**direct-post-back-end.php**

```xml
<?php
$jsonContent = json_decode(file_get_contents('php://input'));

$fields = array(
    'security_key' => '01234567890123456789012345678901',
    'ccnumber' => $jsonContent->cardNumber,
    'ccexp' => $jsonContent->cardExpMonth . substr($jsonContent->cardExpYear, -2),
    'amount' => '10.00',
    'email' => $jsonContent->email,
    'phone' => $jsonContent->phone,
    'city' => $jsonContent->city,
    'address1' => $jsonContent->address1,
    'country' => $jsonContent->country,
    'first_name' => $jsonContent->firstName,
    'last_name' => $jsonContent->lastName,
    'zip' => $jsonContent->postalCode,
    'cavv' => $jsonContent->cavv,
    'xid' => $jsonContent->xid,
    'eci' => $jsonContent->eci,
    'cardholder_auth' => $jsonContent->cardHolderAuth,
    'three_ds_version' => $jsonContent->threeDsVersion,
    'directory_server_id' => $jsonContent->directoryServerId,
    'cardholder_info' => $jsonContent->cardHolderInfo
);

$curl = curl_init();

curl_setopt_array($curl, array(
    CURLOPT_URL => 'https://secure.easypaydirectgateway.com/api/transact.php',
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_ENCODING => '',
    CURLOPT_MAXREDIRS => 10,
    CURLOPT_TIMEOUT => 0,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
    CURLOPT_CUSTOMREQUEST => 'POST',
    CURLOPT_POSTFIELDS => $fields
));

$response = curl_exec($curl);

curl_close($curl);
echo $response;
```

1. You will start by initializing Gateway.js with your public key. You can view your existing public keys
    or create a new one in the merchant portal's [Security Keys](https://secure.easypaydirectgateway.com/merchants/options.php?Action=Keys).
2. Initialize the ThreeDSService by calling gateway.getThreeDSService().
3. Next you will create an interface object with the details of the transaction. The details should
    include cardNumber, cardExpMonth, cardExpYear, currency, amount, email, city, address1, country,
    firstName, lastName, and postalCode. The created interface will emit events that your application can
    subscribe to in order to respond to various results from processing.
4. Mount the interface to the DOM by providing a selector. The frame will be mounted inside the
    provided element. This starts the authentication process.

JavaScript frameworks such as React, Vue, or Angular may control the DOM in such a way that would cause
the frame to become detached from the DOM. You may need to prevent them from managing the mount point
in order to ensure that a mounted interface remains on the page.

6. Attach callbacks to listen for when the customer finishes authenticating themselves.
7. Implement a callback for the complete event that sends the 3DS data to your backend.
8. Submit the 3DS data via the payment API with your private key.

**example.html**

```xml
<html>
<body>
    <label>Credit Card Number</label>
    <div id="ccnumber"></div>
    <label>CC EXP</label>
    <div id="ccexp"></div>
    <label>CVV</label>
    <div id="cvv"></div>
    <button id="payButton">Pay Now</button>

    <div id="threeDSMountPoint"></div>
    <script src="https://secure.easypaydirectgateway.com/js/v1/Gateway.js"></script>
    <script
       src="https://secure.easypaydirectgateway.com/token/Collect.js"
       data-tokenization-key="000000-111111-222222-333333"
    ></script>
    <script>
        const gateway = Gateway.create('checkout_public_00000000000000000000000000000000');
        const threeDS = gateway.get3DSecure();

        window.addEventListener('DOMContentLoaded', () => {
           CollectJS.configure({
               variant: 'inline',
               callback: (e) => {
                   const options = {
                       paymentToken: e.token,
                       currency: 'USD',
                       amount: '1000',
                       email: 'none@example.com',
                       phone: '8008675309',
                       city: 'New York',
                       state: 'NY',
                       address1: '123 Fist St.',
                       country: 'US',
                       firstName: 'John',
                       lastName: 'Doe',
                       postalCode: '60001'
                   };

                   const threeDSecureInterface = threeDS.createUI(options);
                   threeDSecureInterface.start('#threeDSMountPoint');

                   threeDSecureInterface.on('challenge', function(e) {
                       console.log('Challenged');
                   });

                   threeDSecureInterface.on('complete', function(e) {
                       console.log(e);
                       fetch('direct-post-back-end.php', {
                           method: 'POST',
                           body: JSON.stringify({
                               ...options,
                               cavv: e.cavv,
                               xid: e.xid,
                               eci: e.eci,
                               cardHolderAuth: e.cardHolderAuth,
                               threeDsVersion: e.threeDsVersion,
                               directoryServerId: e.directoryServerId,
                               cardHolderInfo: e.cardHolderInfo,
                           })
                       })
                   });

                   threeDSecureInterface.on('failure', function(e) {
                       console.log('failure');
                       console.log(e);
                   });
               }
           })

           gateway.on('error', function (e) {
               console.error(e);
           })
        })
    </script>
</body>
</html>
```

**direct-post-back-end.php**

```xml
<?php
$jsonContent = json_decode(file_get_contents('php://input'));

$fields = array(
    'security_key' => '01234567890123456789012345678901',
    'payment_token' => $jsonContent->paymentToken,
    'amount' => '10.00',
    'email' => $jsonContent->email,
    'phone' => $jsonContent->phone,
    'city' => $jsonContent->city,
    'address1' => $jsonContent->address1,
    'country' => $jsonContent->country,
    'first_name' => $jsonContent->firstName,
    'last_name' => $jsonContent->lastName,
    'zip' => $jsonContent->postalCode,
    'cavv' => $jsonContent->cavv,
    'xid' => $jsonContent->xid,
    'eci' => $jsonContent->eci,
    'cardholder_auth' => $jsonContent->cardHolderAuth,
    'three_ds_version' => $jsonContent->threeDsVersion,
    'directory_server_id' => $jsonContent->directoryServerId
    'cardholder_info' => $jsonContent->cardHolderInfo,
);

$curl = curl_init();

curl_setopt_array($curl, array(
    CURLOPT_URL => 'https://secure.easypaydirectgateway.com/api/transact.php',
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_ENCODING => '',
    CURLOPT_MAXREDIRS => 10,
    CURLOPT_TIMEOUT => 0,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
    CURLOPT_CUSTOMREQUEST => 'POST',
    CURLOPT_POSTFIELDS => $fields
));

$response = curl_exec($curl);

curl_close($curl);
echo $response;
```

This guide uses a minimal Collect.js integration for explanatory purposes. For more information about
using Collect.js, please see the Collect.js documentation.

1. You will start by initializing Gateway.js with your public key. You can view your existing public keys
    or create a new one in the merchant portal's [Security Keys](https://secure.easypaydirectgateway.com/merchants/options.php?Action=Keys) page.
2. Initialize the ThreeDSService by calling gateway.getThreeDSService().
3. Render a Collect.js form to collect the credit card information. You should Collect.js's configure()
    method to supply a callback. The callback will create the 3DS interface and provide the Collect.js
    payment token in place of the credit card details.
4. Next you will create an interface object with the details of the transaction. The details should
    include paymentToken, currency, amount, email, city, address1, country,
    firstName, lastName, and postalCode. The created interface will emit events that your application can
    subscribe to in order to respond to various results from processing.
5. Mount the interface to the DOM by providing a selector. The frame will be mounted inside the
    provided element. This starts the authentication process.

JavaScript frameworks such as React, Vue, or Angular may control the DOM in such a way that would cause
the frame to become detached from the DOM. You may need to prevent them from managing the mount point
in order to ensure that a mounted interface remains on the page.

7. Attach callbacks to listen for when the customer finishes authenticating themselves.
8. Implement a callback for the complete event that sends the 3DS data to your backend.
9. Submit the 3DS data via the payment API with your private key.

**example.html**

```xml
<html>
<body>
<script src="https://secure.easypaydirectgateway.com/js/v1/Gateway.js"></script>
<script>
   const gateway = Gateway.create('collect_checkout_0000000000000000000');
   const threeDS = gateway.get3DSecure();

   const options = {
       customerVaultId: "myCustomerVaultToken",
       billingId: "myBillingId",
       currency: 'USD',
       amount: '1000'
   };

   const threeDSsecureInterface = threeDS.createUI(options);
   threeDSsecureInterface.start('body');

   threeDSsecureInterface.on('challenge', function(e) {
       console.log('Challenged');
   });

   threeDSsecureInterface.on('complete', function(e) {
       fetch('direct-post-back-end.php', {
           method: 'POST',
           body: JSON.stringify({
               ...options,
               cavv: e.cavv,
               xid: e.xid,
               eci: e.eci,
               cardHolderAuth: e.cardHolderAuth,
               threeDsVersion: e.threeDsVersion,
               directoryServerId: e.directoryServerId,
               cardHolderInfo: e.cardHolderInfo,
           })
       })
           .then(e => {

           })
   });

   threeDSsecureInterface.on('failure', function(e) {
       console.log('failure');
       console.log(e);
   });

   gateway.on('error', function (e) {
       console.error(e);
   })
</script>
</body>
</html>
```

**direct-post-back-end.php**

```xml
<?php

$jsonContent = json_decode(file_get_contents('php://input'));

$fields = array(
   'security_key' => '01234567890123456789012345678901',
   'customer_vault_id' => $jsonContent->customerVaultId,
   'billing_id' => $jsonContent->billingId,
   'amount' => '10.00',
   'cavv' => $jsonContent->cavv,
   'xid' => $jsonContent->xid,
   'eci' => $jsonContent->eci,
   'cardholder_auth' => $jsonContent->cardHolderAuth,
   'three_ds_version' => $jsonContent->threeDsVersion,
   'directory_server_id' => $jsonContent->directoryServerId
   'cardholder_info' => $jsonContent->cardHolderInfo,
);

$curl = curl_init();

curl_setopt_array($curl, array(
   CURLOPT_URL => 'https://secure.easypaydirectgateway.com/api/transact.php',
   CURLOPT_RETURNTRANSFER => true,
   CURLOPT_ENCODING => '',
   CURLOPT_MAXREDIRS => 10,
   CURLOPT_TIMEOUT => 0,
   CURLOPT_FOLLOWLOCATION => true,
   CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
   CURLOPT_CUSTOMREQUEST => 'POST',
   CURLOPT_POSTFIELDS => $fields
));

$response = curl_exec($curl);

curl_close($curl);
echo $response;
```

1. You will start by initializing Gateway.js with your public key. You can view your existing public keys
    or create a new one in the merchant portal's [Security Keys](https://secure.easypaydirectgateway.com/merchants/options.php?Action=Keys) page.
2. Initialize the ThreeDSService by calling gateway.getThreeDSService().
3. Next you will create a interface object with the details of the transaction. The details should
    customerVaultId, currency, amount. The created interface will emit events that your application can
    subscribe to in order to respond to various results from processing.
4. Mount the interface to the DOM by providing a selector. The frame will be mounted inside the
    provided element. This starts the authentication process.

JavaScript frameworks such as React, Vue, or Angular may control the DOM in such a way that would cause
the frame to become detached from the DOM. You may need to prevent them from managing the mount point
in order to ensure that a mounted interface remains on the page.

6. Attach callbacks to listen for when the customer finishes authenticating themselves.
7. Implement a callback for the complete event that sends the 3DS data to your backend.
8. Submit the 3DS data via the payment API with your private key.

# Manual Device Data Collection

The 3-D Secure service attempts to collect device data from the customer's browser,
but sometimes this process can time-out and cause the request to fail. You can account for these time-outs
by manually collecting the 8 device data fields for the options array passed to the
threeDS.createUI() call.

The example below uses the base Gateway.js integration, but you can also collect the
device data fields for any integrations documented in the ThreeDSService guides above.

**example.html**

```xml
<html>
    <body>
    <script src="https://secure.easypaydirectgateway.com/js/v1/Gateway.js"></script>
    <script>
        // Initialize Gateway.js
        const gateway = Gateway.create('collect_checkout_0000000000000000000000');

        // Initialize the ThreeDSService
        const threeDS = gateway.get3DSecure();

        // Create a 3DS Frame
        // This will start out 0px x 0px during fingerprinting.
        // If the customer is prompted to complete a challenge, it will resize automatically.

        // window.navigator.javaEnabled() is deprecated in modern browsers, use a try/catch to future-proof your code
        try {
            const userBrowserJavaEnabled = String(window.navigator.javaEnabled());
        } catch(e) {
            const userBrowserJavaEnabled = String(false);
        }

        const options = {
            cardNumber: "4111111111111111",
            cardExpMonth: "01",
            cardExpYear: "2024",
            currency: 'USD',
            amount: '10.00',
            email: 'none@example.com',
            phone: '8008675309',
            city: 'New York',
            state: 'NY',
            address1: '123 First St.',
            country: 'US',
            firstName: 'Jane',
            lastName: 'Doe',
            postalCode: '60001',
            browserJavaEnabled: userBrowserJavaEnabled,
            browserJavascriptEnabled: String(true),
            browserLanguage: window.navigator.language || window.navigator.userLanguage,
            browserColorDepth: String(window.screen.colorDepth),
            browserScreenHeight: String(window.screen.height),
            browserScreenWidth: String(window.screen.width),
            browserTimeZone: String(new Date().getTimezoneOffset()),
            deviceChannel: 'Browser'
        };

        const threeDSecureInterface  = threeDS.createUI(options);

        // Mount the threeDSecureInterface to the DOM
        // This begins the collection of 3DS data.
        threeDSecureInterface.start('body');

        // Listen for the threeDSecureInterface to ask the user for a password
        threeDSecureInterface.on('challenge', function(e) {
            console.log('Challenged');
        });

        // Listen for the threeDSecureInterface to provide all the needed 3DS data
        threeDSecureInterface.on('complete', function(e) {
            fetch('direct-post-back-end.php', {
                method: 'POST',
                body: JSON.stringify({
                    ...options,
                    cavv: e.cavv,
                    xid: e.xid,
                    eci: e.eci,
                    cardHolderAuth: e.cardHolderAuth,
                    threeDsVersion: e.threeDsVersion,
                    directoryServerId: e.directoryServerId,
                    cardHolderInfo: e.cardHolderInfo,
                })
            })
        });

        // Listen for the threeDSecureInterface to indicate that the customer
        // has failed to authenticate
        threeDSecureInterface.on('failure', function(e) {
            console.log('failure');
            console.log(e);
        });

        // Listen for any errors that might occur.
        gateway.on('error', function (e) {
            console.error(e);
        })
    </script>
    </body>
</html>
```

**direct-post-back-end.php**

```xml
<?php
$jsonContent = json_decode(file_get_contents('php://input'));

$fields = array(
    'security_key' => '01234567890123456789012345678901',
    'ccnumber' => $jsonContent->cardNumber,
    'ccexp' => $jsonContent->cardExpMonth . substr($jsonContent->cardExpYear, -2),
    'amount' => '10.00',
    'email' => $jsonContent->email,
    'phone' => $jsonContent->phone,
    'city' => $jsonContent->city,
    'address1' => $jsonContent->address1,
    'country' => $jsonContent->country,
    'first_name' => $jsonContent->firstName,
    'last_name' => $jsonContent->lastName,
    'zip' => $jsonContent->postalCode,
    'cavv' => $jsonContent->cavv,
    'xid' => $jsonContent->xid,
    'eci' => $jsonContent->eci,
    'cardholder_auth' => $jsonContent->cardHolderAuth,
    'three_ds_version' => $jsonContent->threeDsVersion,
    'directory_server_id' => $jsonContent->directoryServerId,
    'cardholder_info' => $jsonContent->cardHolderInfo,
    'browser_java_enabled' => $jsonContent->browserJavaEnabled,
    'browser_javascript_enabled' => $jsonContent->browserJavascriptEnabled,
    'browser_language' => $jsonContent->browserLanguage,
    'browser_color_depth' => $jsonContent->browserColorDepth,
    'browser_screen_height' => $jsonContent->browserScreenHeight,
    'browser_screen_width' => $jsonContent->browserScreenWidth,
    'browser_time_zone' => $jsonContent->browserTimeZone,
    'device_channel' => $jsonContent->deviceChannel
);

$curl = curl_init();

curl_setopt_array($curl, array(
    CURLOPT_URL => 'https://secure.easypaydirectgateway.com/api/transact.php',
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_ENCODING => '',
    CURLOPT_MAXREDIRS => 10,
    CURLOPT_TIMEOUT => 0,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
    CURLOPT_CUSTOMREQUEST => 'POST',
    CURLOPT_POSTFIELDS => $fields
));

$response = curl_exec($curl);

curl_close($curl);
echo $response;
```

# Kount

Kount can identify and block fraudulent transactions by analyzing many different data points before the transaction is submitted for processing. The Kount Data Collector is a critical part of the analysis and we've made it simple to implement in your own checkout pages when using our Payment API, or Collect.js. The Kount Device Data Collector is designed to run in the background while a webpage loads in a client browser and gather data on the consumer as they check out through your ecommerce website.

## Kount variables

When a customer is on a payment page, the Kount library will provide the following, which you must submit to the payment API in order for Kount to function properly:

| Variable | Description | When Received |
| --- | --- | --- |
| transaction\_session\_id | A single use session ID used by Kount to link the transaction and Data Collector information together. <br>This ID should be generated every time a payment form is loaded by the cardholder, and be random/unpredictable (do not use sequential IDs). This ID should not be reused within a 30 day period. | After the Kount data collector has run |

This guide uses a minimal Collect.js integration for explanatory purposes. For more information about
using Collect.js, please see the Collect.js documentation.

The Kount data collector should be run immediately on a payment page, and may be run multiple times. Each call to createSession() will return a session ID. When submitting, use the latest value.

1. You will start by initializing Gateway.js with your public key. You can view your existing public keys
    or create a new one in the merchant portal's [Security Keys](https://secure.easypaydirectgateway.com/merchants/options.php?Action=Keys) page.
2. Initialize the Kount service by calling gateway.getKount().
3. Run the Kount data collector by calling Kount's createSession() and retrieve the session ID using .then() .
4. Render a Collect.js form to collect the credit card information. You should call Collect.js's configure()
    method to supply a callback. The callback will provide the Collect.js payment token in place of the credit card details.
5. In the callback, create a Javascript object with the details of the transaction. The details should
    include payment\_token, currency, amount, email, city, address1, country, zip,
    first\_name, last\_name, and transaction\_session\_id.
6. Submit the transaction data via the payment API with your private key.

**example.html**

```xml
<html>
<body>
    <label>Credit Card Number</label>
    <div id="ccnumber"></div>
    <label>CC EXP</label>
    <div id="ccexp"></div>
    <label>CVV</label>
    <div id="cvv"></div>
    <button id="payButton">Pay Now</button>
    <script src="https://secure.easypaydirectgateway.com/js/v1/Gateway.js"></script>
    <script
       src="https://secure.easypaydirectgateway.com/token/Collect.js"
       data-tokenization-key="000000-111111-222222-333333"
    ></script>
    <script>
        // Initialize Gateway.js, use own Public Key
        const gateway = Gateway.create('collect_checkout_0000000000000000000000000');

        // Initialize the Kount service
        const kount = gateway.getKount();

        // Run Kount
        kount.createSession().then((res) => {

            //Store session id
            const sessionId = res;

            //Run CollectJS Configure
            CollectJS.configure({
                variant: 'inline',
                callback: (e) => {
                    const options = {
                        paymentToken: e.token,
                        currency: 'USD',
                        amount: '1000',
                        email: 'none@example.com',
                        phone: '8008675309',
                        city: 'New York',
                        state: 'NY',
                        address1: '123 First St.',
                        country: 'US',
                        firstName: 'John',
                        lastName: 'Doe',
                        postalCode: '60001',
                        transactionSessionId: sessionId
                    };

                    fetch('direct-post-back-end.php', {
                        method: 'POST',
                        body: JSON.stringify({
                            ...options,
                        })
                    });
                }
            });

            gateway.on('error', function (e) {
                console.error(e);
            });
        });
    </script>
</body>
</html>
```

**direct-post-back-end.php**

```xml
<?php
$jsonContent = json_decode(file_get_contents('php://input'));

$fields = array(
    'security_key' => '01234567890123456789012345678901',
    'payment_token' => $jsonContent->paymentToken,
    'amount' => '10.00',
    'email' => $jsonContent->email,
    'phone' => $jsonContent->phone,
    'city' => $jsonContent->city,
    'address1' => $jsonContent->address1,
    'country' => $jsonContent->country,
    'first_name' => $jsonContent->firstName,
    'last_name' => $jsonContent->lastName,
    'zip' => $jsonContent->postalCode,
    'transaction_session_id' => $jsonContent->transactionSessionId
);

$curl = curl_init();

curl_setopt_array($curl, array(
    CURLOPT_URL => 'https://secure.easypaydirectgateway.com/api/transact.php',
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_ENCODING => '',
    CURLOPT_MAXREDIRS => 10,
    CURLOPT_TIMEOUT => 0,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
    CURLOPT_CUSTOMREQUEST => 'POST',
    CURLOPT_POSTFIELDS => $fields
));

$response = curl_exec($curl);

curl_close($curl);
echo $response;
```

The Kount data collector should be run immediately on a payment page, and may be run multiple times. Each call to createSession() will return a session ID. When submitting, use the latest value.

Session IDs need to be provided to the payment API. If you don’t pass a Session ID, Kount will not run correctly.

1. You will start by initializing Gateway.js with your public key. You can view your existing public keys
    or create a new one in the merchant portal's [Security Keys](https://secure.easypaydirectgateway.com/merchants/options.php?Action=Keys) page.
2. Initialize the Kount service by calling gateway.getKount().
3. Run the Kount data collector by calling Kount's createSession() and retrieve the session ID using .then() .
4. Next, you will create a Javascript object with the details of the transaction. The details should
    include the credit card information, currency, amount, email, city, address1, country, zip,
    first\_name, last\_name, and transaction\_session\_id.
5. Submit the transaction data via the payment API with your private key.

**example.html**

```xml
<html>
    <body>
    <script src="https://secure.easypaydirectgateway.com/js/v1/Gateway.js"></script>
    <script>
        // Initialize Gateway.js, use own Public Key
        const gateway = Gateway.create('collect_checkout_0000000000000000000000000');

        // Initialize the Kount service
        const kount = gateway.getKount();

        // Run Kount
        kount.createSession().then((res) => {
            //Store session id
            const transactionSessionId = res;

            //Code goes here...
            console.log(transactionSessionId);

        });

        // Listen for any errors that might occur
        gateway.on('error', function (e) {
            console.error(e);
        });
    </script>
    </body>
</html>
```

## Gateway\#create(string publicKey): Gateway

### Description

Initializes a Gateway object that can be used to initialize other services.

* * *

### Parameters

**publicKey**
A string generated from the merchant portal's [Security Keys](https://secure.easypaydirectgateway.com/merchants/options.php?Action=Keys) page.
The publicKey should have the Checkout permission.

Example: collect\_checkout\_0000000000000000000000000


* * *

### Side Effects

Raises an '{error}' event if provided an invalid public key.


* * *

### Example

```actionscript
const gateway = Gateway.create('collect_checkout_0000000000000000000000000')
```

## Gateway.get3DSecure(): ThreeDSecure

### Description

Initializes 3DSecure.

* * *

### Parameters

None

* * *

### Side Effects

Raises an '{error}' event if Payer Authentication is not active.

* * *

### Example

```actionscript
const gateway = Gateway.create('collect_checkout_0000000000000000000000000')
const threeDSecure = gateway.get3DSecure();
```

## Gateway.getKount(): Kount

### Description

Initializes Kount.

* * *

### Parameters

None

* * *

### Side Effects

Raises an '{error}' event if {kount} is not active.

* * *

### Example

```actionscript
const gateway = Gateway.create('collect_checkout_0000000000000000000000000')
const kount = gateway.getKount();
```

## Gateway.on(string eventName, func callback): undefined

### Description

Attaches an event listener that is invoked when the given event occurs.

* * *

### Parameters

**event**
One of the following:

- error

**callback**
A function that accepts an event object as a parameter.

* * *

### Events:

#### Error

```applescript
const gateway = Gateway.create('collect_checkout_0000000000000000000000000');
gateway.on('error', (e) => { console.error (e) })

/*
 *  {
 *     refId: '1234',
 *     message: '3DSecure is inactive on your account. Contact support
 *       to activate the payment gateway's 3DSecure service.',
 *     type: 'integrationError',
 *     error: new Error('3DSecure is inactive on your account. Contact
 *       support to activate the payment gateway's 3DSecure service.')
 *  }
 * /
```

* * *

## ThreeDSecure.createUI(object options): ThreeDSecureUI

### Description

Create a ThreeDSecureUI from the provided options.

* * *

### Parameters

**options**
object containing the following values:


| Option | Description | Examples | Required |
| --- | --- | --- | --- |
| cardNumber | The card number to run 3DS for | '4111111111111111' | Yes, if using raw credit card data<br>No, if using paymentToken or customerVaultId |
| cardExpMonth | 2 digit card expiration date for the month | '07' (meaning July) | Yes, if using raw credit card data<br>No, if using paymentToken or customerVaultId |
| cardExpYear | 2 or 4 digit card expiration year | '2021'<br> <br>'24' | Yes, if using raw credit card data<br>No, if using paymentToken or customerVaultId |
| paymentToken | Token from Collect.js | '00000000-000000-000000-000000000000' | Yes, if using Collect.js<br>No, if using raw card data or customerVaultId |
| customerVaultId | Merchant defined Customer Vault id. This is **not** the billing id or shipping id. | '12345' | Yes, if using Customer Vault<br>No, if using raw card data or paymentToken |
| billingId | Merchant defined billing ID. This is **not** the Customer Vault ID or shipping ID. | '67890' | No. Only permitted if customerVaultId is sent. If not specified, the default billing ID is used |
| currency | The 3 character currency code for the transaction. | 'USD'<br>'GBP' | Yes |
| amount | The amount of the transaction in minor units. If the customer is challenged,<br> this value will be displayed on the challenge screen. | '1000' (meaning 10 USD) | Yes |
| email | The email address of the cardholder that owns the card. Required (if available) unless market or regional mandate restricts sending this information. | 'example@example.com' | Yes, if applicable |
| city | The cardholder's city. Required (if available) unless market or regional mandate restricts sending this information. | 'Atlanta' | Yes, if applicable |
| address1 | The cardholder's address. Required (if available) unless market or regional mandate restricts sending this information. | '123 Fake St.' | Yes, if applicable |
| address2 | The cardholder's address | 'APT 1' | No |
| address3 | The cardholder's address | 'Unit 1' | No |
| country | The customer's country. 2 Characters, ISO 3166. Required (if available) unless market or regional mandate restricts sending this information. | 'US' | Yes, if applicable |
| firstName | The first name of the cardholder | 'Jane' | Yes |
| lastName | The last name of the cardholder | 'Doe' | Yes |
| postalCode | The zip code or postal code of the cardholder. Required (if available) unless market or regional mandate restricts sending this information. | '60605' | Yes, if applicable |
| state | The state, province, or other subdivision of the cardholder. This field must be a 2 character subdivision code defined by [ISO 3166-2](https://en.wikipedia.org/wiki/ISO_3166-2). Required (if available) unless market or regional mandate restricts sending this information. | 'GA' | Yes, if applicable |
| phone | The phone number of the cardholder | '8008675309' | No |
| shippingCity | City the cardholder would like their purchase shipping to | 'Chicago' | No |
| shippingAddress1 | Address the cardholder would like their purchase shipping to | '123 Fake st' | No |
| shippingAddress2 | Address the cardholder would like their purchase shipping to | 'APT 2' | No |
| shippingAddress3 | Address the cardholder would like their purchase shipping to | 'Unit 1' | No |
| shippingCountry | Country the cardholder would like their purchase shipping to. 2 characters, ISO 3166. | 'US' | No |
| shippingFirstName | First name of the recipient | 'John' | No |
| shippingLastName | Last name of the recipient | 'Doe' | No |
| shippingPostalCode | Zip code or postal code the cardholder would like their purchase shipping to | '60605' | No |
| shippingState | The state, province, or other subdivision of the cardholder. This field must be a 2 character subdivision code defined by [ISO 3166-2](https://en.wikipedia.org/wiki/ISO_3166-2). | 'GA' | No |
| processor | The processor id that will be used to run the transaction.<br>Processor ids can be found in the merchant portal in <br>[Transaction Routing](https://secure.easypaydirectgateway.com/merchants/options.php?Action=TransactionRouting) | 'myprocessor' | No, if not provided the system will automatically use your default processor |
| challengeIndicator | The 2-digit 3DS challenge indicator you would like to pass along with the 3DS request.<br>Requests that the card issuer does or doesn't challenge a customer. | '01' - No preference<br>'02' - No challenge requested<br>'03' - Challenge requested (3DS Requestor preference)<br>'04' - Challenge requested (Mandate)<br>'05' - No challenge requested (transactional risk analysis is already performed)<br>'06' - No challenge requested (data share only)<br>'07' - No challenge requested (strong consumer authentication is already performed)<br>'08' - No challenge requested (utilise allowlist exemption if no challenge required)<br>'09' - Challenge requested (allowlist prompt requested if challenge required) | No, if not provided the system will automatically use '01' - No preference. |
| browserJavaEnabled | The string value of the browser's setting for if Java is enabled.<br>As this is a deprecated field for most modern browsers, a try/catch is recommended to future-proof your integration. | ```javascript<br>try {<br>    const userBrowserJavaEnabled = String(window.navigator.javaEnabled());<br>} catch(e) {<br>    const userBrowserJavaEnabled = String(false);<br>}<br>/* In threeDsService.createUI(): */<br>browserJavaEnabled: userBrowserJavaEnabled<br>``` | Yes, if you are [manually collecting device data](https://secure.easypaydirectgateway.com/merchants/resources/integration/integration_portal.php#gjs_guides_ddcFields). |
| browserJavascriptEnabled | The string value of the browser's setting for if Javascript is enabled.<br>Since using Gateway.js requires the user's browser to have Javascript enabled, it is safe to default this to true. | ```javascript<br>String(true)<br>``` | Yes, if you are [manually collecting device data](https://secure.easypaydirectgateway.com/merchants/resources/integration/integration_portal.php#gjs_guides_ddcFields). |
| browserLanguage | The string value of the browser's setting for the user's selected language. | ```coffeescript<br>window.navigator.language || window.navigator.userLanguage<br>``` | Yes, if you are [manually collecting device data](https://secure.easypaydirectgateway.com/merchants/resources/integration/integration_portal.php#gjs_guides_ddcFields). |
| browserColorDepth | The string value of the user's screen's color depth. | ```javascript<br>String(window.screen.colorDepth)<br>``` | Yes, if you are [manually collecting device data](https://secure.easypaydirectgateway.com/merchants/resources/integration/integration_portal.php#gjs_guides_ddcFields). |
| browserScreenHeight | The string value of the user's screen's height. | ```javascript<br>String(window.screen.height)<br>``` | Yes, if you are [manually collecting device data](https://secure.easypaydirectgateway.com/merchants/resources/integration/integration_portal.php#gjs_guides_ddcFields). |
| browserScreenWidth | The string value of the user's screen's width. | ```javascript<br>String(window.screen.width)<br>``` | Yes, if you are [manually collecting device data](https://secure.easypaydirectgateway.com/merchants/resources/integration/integration_portal.php#gjs_guides_ddcFields). |
| browserTimeZone | The string value of the user's timezone | ```javascript<br>String(new Date().getTimezoneOffset())<br>``` | Yes, if you are [manually collecting device data](https://secure.easypaydirectgateway.com/merchants/resources/integration/integration_portal.php#gjs_guides_ddcFields). |
| deviceChannel | This is required to be 'Browser' | 'Browser' | Yes, if you are [manually collecting device data](https://secure.easypaydirectgateway.com/merchants/resources/integration/integration_portal.php#gjs_guides_ddcFields). |

* * *

### Side Effects:

Raises an error if options are invalid.

* * *

### Example:

```actionscript
const gateway = Gateway.create('collect_checkout_0000000000000000000000000');
const threeDsService = gateway.get3DSecure();

const threeDSecureUI = threeDsService.createUI({
    customerVaultId: "myCustomerVaultToken",
    billingId: 'myBillingId'
    currency: 'USD',
    amount: '1000'
})
```

* * *

## ThreeDSecure.on(string eventName, func callback): undefined

### Description

Attaches an event listener that is invoked when the given event occurs.

* * *

### Parameters

**event**
One of the following:

- error

**callback**
A function that accepts an event object as a parameter.

* * *

### Events:

#### Error

```lua
const gateway = Gateway.create('collect_checkout_0000000000000000000000000');
const threeDsService = gateway.get3DSecure();

threeDsService.on('error', (e) => { console.error (e) })

/*
 *  {
 *     refId: '1234',
 *     message: 'Unknown options: invalidField',
 *     type: 'integrationError',
 *     error: new Error('Unknown options: invalidField')
 *  }
 * /
```

* * *

## ThreeDSecureUI.start(string mountPointSelector): undefined

### Description

Creates an HTML element that will fingerprint the cardholder's browser and - if
required by the issuing bank - expand to display a challenge for the cardholder to complete.
The HTML element will become a child of the element provided in the mount point.

* * *

### Parameters

**mountPointSelector**
A selector string that will identify a single element on the page.


Examples: "body", "#mountPoint", ".threeDSDiv"

* * *

### Side Effects

Raises an error if more than one element matches the mountPointSelector or no elements match.

Raises an error if a ThreeDSecureUI has already started. The started ThreeDSecureUI must be unmounted before a new ThreeDSecureUI can be started or restarted.

* * *

### Example:

```actionscript
const gateway = Gateway.create('collect_checkout_0000000000000000000000000');
const threeDsService = gateway.get3DSecure();
const threeDSecureUI = threeDsService.createUI({ ... })
threeDSecureUI.start('body');
```

* * *

## ThreeDSecureUI.on(string eventName, func callback): undefined

### Description

Attaches an event listener that is invoked when the given event occurs.

* * *

### Parameters

**event**
One of the following:

- failure
- challenge
- complete
- error

**callback**
A function that accepts an event object as a parameter.

* * *

### Events:

#### Failure

This event indicates that the cardholder could not be authenticated.

```cs
const gateway = Gateway.create('collect_checkout_0000000000000000000000000');
const threeDsService = gateway.get3DSecure();
const threeDSecureUI = threeDsService.createUI({ ... })
threeDSecureUI.on('failure', (e) => { console.log(e) })

/*
 *  {
 *     code: 'TRANSACTION_STATUS_N',
 *     message: 'Not Authenticated/Account Not Verified; Transaction denied',
 *  }
 * /
```

#### Challenge

This event indicates that step up authentication has started and the user will need to complete a challenge. When this occurs, the UI will automatically resize.


```cs
const gateway = Gateway.create('collect_checkout_0000000000000000000000000');
const threeDsService = gateway.get3DSecure();
const threeDSecureUI = threeDsService.createUI({ ... })
threeDSecureUI.on('challenge', (e) => { console.log(e) })

/*
 *  {}
 * /
```

#### Complete

This indicates successful 3DS authentication has occurred.


```vbscript
const gateway = Gateway.create('collect_checkout_0000000000000000000000000');
const threeDsService = gateway.get3DSecure();
const threeDSecureUI = threeDsService.createUI({ ... })
threeDSecureUI.on('complete', (e) => { console.error(e) })

/*
 * {
 *  xid: null,
 *  cavv: "Y2FyZGluYWxjb21tZXJjZWF1dGg=",
 *  eci: "05",
 *  cardHolderAuth: "verified",
 *  threeDsVersion: "2.2.0",
 *  directoryServerId: "3f6fb1f8-f719-46c9-905b-bab446f4de30"
  *  cardHolderInfo: null,
 * }
 * /
```

| Variable | Description | When Received |
| --- | --- | --- |
| cavv | Cardholder Authentication Verification Value<br>The value that signifies that a customer was successfully authenticated. | On all successful authentications |
| xid | A transaction identifier from authentication processing | Occasionally provided for some card brands |
| directoryServerId | A transaction identifier assigned by the directory server. | On all successful 3DS2 authentications |
| eci | A number that indicates the result of the attempt to authenticate the cardholder. Values are dependent on the card brand. | On successful authentications |
| cardHolderAuth | A string describing if a customer was successfully verified or attempted.<br>"verified" indicates that a cardholder’s bank successfully verified the user.<br>"attempted" indicates that a cardholder is enrolled in 3DS, but their bank does not support 3DS.<br>Examples: verified, attempted | On successful authentications |
| threeDsVersion | Determines which version of 3DS was used.<br>Examples: 1.0.2, 2.1.0, 2.2.0 | On all successful authentications |

#### Error

```lua
const gateway = Gateway.create('collect_checkout_0000000000000000000000000');
const threeDsService = gateway.get3DSecure();
const threeDSecureUI = threeDsService.createUI({ ... })
threeDSecureUI.on('error', (e) => { console.error(e) })

/*
 *  {
 *     refId: '1234',
 *     message: 'Invalid Formatted Message Invalid Formatted Message',
 *     type: 'gatewayError',
 *     error: new Error('Invalid Formatted Message Invalid Formatted Message')
 *  }
 * /
```

* * *

## Kount.start(): string

### Description

Creates a session ID and runs the Kount data collector.

* * *

### Parameters

None

* * *

### Side Effects

Raises an error if the session ID cannot be generated.

* * *

### Example:

```cs
const gateway = Gateway.create('collect_checkout_0000000000000000000000000');
const kount = gateway.getKount();
const sessionId = await kount.createSession();
```

* * *

# Testing

It is recommended to test your integration before going live. This can be accomplished by putting your
account in [Test Mode](https://secure.easypaydirectgateway.com/merchants/options.php?Action=TestMode) and providing these test cards to ThreeDSecure#createUI(). These test cases
will not function when your account has test mode disabled.

## Test Card 1: Successful Frictionless Flow

This test demonstrates that the issuing bank has authenticated the cardholder without needing to challenge them.

**Card Number:**
4000000000002701


**Result:**
ThreeDSecureUI will emit a Complete event with:

```actionscript
{
    xid: null,
    cavv: "Y2FyZGluYWxjb21tZXJjZWF1dGg=",
    eci: "05",
    cardHolderAuth: "verified",
    threeDsVersion: "2.2.0",
    directoryServerId: "3f6fb1f8-f719-46c9-905b-bab446f4de30"
    cardHolderInfo: null,
}
```

## Test Card 2: Failed Frictionless

This test demonstrates that the issuing bank has failed to authenticate the cardholder without needing to challenge them. This does not indicate a technical problem. It is an automatic rejection.

**Card Number:**
4000000000002925


**Result:**
ThreeDSecureUI will emit an Error event with:

```json
{
  "refId": "1001153",
  "message": "Payer Authentication Error - Blocked due to Failed Authentication rule",
  "type": "generalError",
  "error": "Error(Payer Authentication Error - Blocked due to Failed Authentication rule REFID: 1001153)"
}
```

## Test Card 3: Attempted Frictionless Flow

This test demonstrates a cardholder that is enrolled in 3DSecure but the issuing bank does not support it.

**Card Number:**
4000000000002719


**Result:**
ThreeDSecureUI will emit a Complete event with:

```actionscript
{
    xid: null,
    cavv: "Y2FyZGluYWxjb21tZXJjZWF1dGg=",
    eci: "06",
    cardHolderAuth: "attempted",
    threeDsVersion: "2.2.0",
    directoryServerId: "3f6fb1f8-f719-46c9-905b-bab446f4de30"
    cardHolderInfo: null,
}
```

## Test Card 4: Unavailable Authentication

This test demonstrates that authentication is unavailable for some technical reasons.

**Card Number:**
4000000000002313


**Result:**
ThreeDSecureUI will emit a Failure event with:

```actionscript
{
    code: "TRANSACTION_STATUS_U",
    message: "Authentication/Account Verification Could Not Be Performed; Technical or other problem"
}
```

## Test Card 5: Rejected Authentication

This test demonstrates that the issuing bank has rejected authentication for the cardholder without needing to challenge them. This does not indicate a technical problem. This is an automatic rejection.

**Card Number:**
4000000000002537


**Result:**
ThreeDSecureUI will emit an Error event with:

```json
{
  "refId": "1001154",
  "message": "Payer Authentication Error - Blocked due to Failed Authentication rule",
  "type": "generalError",
  "error": "Error(Payer Authentication Error - Blocked due to Failed Authentication rule REFID: 1001154)"
}
```

## Test Card 6: Unknown Error

This test demonstrates that an unknown error has occurred due to a technical error.

**Card Number:**
4000000000002990


**Result:**
ThreeDSecureUI will emit an Error event with:

```lua
{
    refId: '1234',
    message: "Invalid Formatted Message Invalid Formatted Message",
    type: 'gatewayError',
    error:  "error": "Error(Invalid Formatted Message Invalid Formatted Message REFID: 1001155)"
}
```

## Test Card 7: Timeout Error

This test demonstrates that an error has occurred due to a technical error.

**Card Number:**
4000000000002354


**Result:**
ThreeDSecureUI will emit an Error event with:

```bash
{
    refId: '1234',
    message: "Transaction Timed Out",
    type: 'gatewayError',
    "error": "Error(Transaction Timed Out REFID: 1001156)"
}
```

## Test Card 8: Successful Step Up

This test demonstrates that the issuing bank has decided to challenge the user and successfully authenticates the result.

**Card Number:**
4000000000002503


**Result:**
After the ThreeDSecureUI is started, it will display an interface prompting the user for a password. When completed, the ThreeDSecureUI will emit a Complete event with:

```actionscript
{
    xid: null,
    cavv: "MTIzNDU2Nzg5MDEyMzQ1Njc4OTA=",
    eci: "05",
    cardHolderAuth: "verified",
    threeDsVersion: "2.2.0",
    directoryServerId: "19304dc2-58e0-497f-8508-f434c45a7a05"
    cardHolderInfo: null,
}
```

## Test Card 9: Failed Step Up

This test demonstrates that the issuing bank has decided to challenge the user and fails to authenticate the cardholder.

**Card Number:**
4000000000002370


**Result:**
After the ThreeDSecureUI is started, it will display an interface prompting the user for a password. When completed, the ThreeDSecureUI will emit a Failure event with:

```actionscript
{
    code: "TRANSACTION_STATUS_N",
    message: "Not Authenticated/Account Not Verified; Transaction denied"
}
```

## Test Card 10: Unavailable Step Up

This test demonstrates that the issuing bank has decided to challenge the user and authentication is unavailable.

**Card Number:**
4000000000002420


**Result:**
After the ThreeDSecureUI is started, it will display an interface prompting the user for a password. When completed, the ThreeDSecureUI will emit a Failure event with:

```actionscript
{
    code: "TRANSACTION_STATUS_U",
    message: "Authentication/Account Verification Could Not Be Performed; Technical or other problem"
}
```

## Test Card 11: Error on Authentication

This test demonstrates that an unknown error occurred during authentication.

**Card Number:**
4000000000002644


**Result:**
After the ThreeDSecureUI is started, it will display an interface prompting the user for a password. When completed, the ThreeDSecureUI will emit an Error event with:

```applescript
{
    refId: null,
    message: "A 3DS error occurred: Error Processing PARes",
    type: "gatewayError",
    error: "Error("A 3DS error occurred: Error Processing PARes)"
}
```

# Methodology  Three-Step

## Method Overview

- Step One:
Submit all transaction details to the Payment Gateway except the customer's sensitive payment information. The Payment Gateway will return a variable form-url.

- Step Two:
Create an HTML form that collects the customer's sensitive payment information and use the form-url that the Payment Gateway returns as the submit action in that form.

- Step Three:
Once the customer has been redirected, obtain the token-id and complete the transaction through an HTTPS POST including the token-id which abstracts the sensitive payment information that was collected directly by the Payment Gateway.


## Detailed Explanation

To start step one, your payment application will submit a behind-the-scenes HTTPS direct POST that includes transaction variables, including an additional variable redirect-url, which is a URL that must exist on your web server that handles a future browser redirect. Sensitive payment information such as cc-number, cc-exp, and cvv cannot be submitted during step one. The Payment Gateway will generate and return the form-url variable containing a unique URL to be used in Step 2.

Next, during step two, you must develop an HTML form that collects at least the customer's sensitive payment information such as cc-number, cc-exp, and cvv. You must use the form-url obtained in step one as the action in the HTML of your payment form. When the customer submits the form, the customer's browser will transparently POST the contents of the payment form directly to the Payment Gateway. This methodology keeps your web server and payment application from seeing or transmitting any credit card data or other sensitive data. Once the Payment Gateway has collected the customer's sensitive payment details, the customer's browser will be instructed to return to the redirect-url on your web server. Furthermore, the Payment Gateway will generate and append a unique variable named token-id to the redirect-url in the GET query string. This token-id is an abstraction of the customer's sensitive payment information that the Payment Gateway collected. Your redirect-url script must parse the token-id for use in step three.

To complete the transaction, you will submit another behind-the-scenes HTTPS direct POST including only the token-id and api-key. This token-id is used to "tie" together the initial customer information with the sensitive payment information that the payment gateway collected directly.

![](<Base64-Image-Removed>)

# Step One  Three-Step: Transactions

## Sale/Auth/Credit/Validate/Offline XML Request

| XML Element | Description |
| --- | --- |
| <sale\|auth\|credit\|validate\|offline> | Type of transaction to perform. |
| api-key\* | api-key is obtained in the security keys section of the control panel settings. |
| redirect-url\* | A URL on your web server that the gateway will redirect your customer to after sensitive data collection. |
| amount\* | Total amount to be charged (For "validate" actions, amount must be 0.00 or omitted). |
| surcharge-amount | Surcharge amount.<br>Format: x.xx |
| authorization-code\*\* | Specify authorization code. For use with "offline" action only. |
| ip-address | Cardholder's IP address.<br>Format: xxx.xxx.xxx.xxx |
| industry | Specify industry classification of transaction.<br>Values: 'ecommerce', 'moto', or 'retail' |
| billing-method | Set additional billing indicators.<br>Values: 'recurring' or 'installment' |
| billing-number | Specify installment billing number, on supported processors. For use when "billing-method" is set to installment.<br>Values: 0-99 |
| billing-total | Specify installment billing total on supported processors. For use when "billing-method" is set to installment. |
| processor-id | If using multiple processors, route to specified processor. Obtained under Settings->Transaction Routing in the merchant control panel. |
| sec-code | ACH standard entry class codes.<br>Values: 'PPD', 'WEB', 'TEL', 'CCD', 'POP', or 'ARC' |
| descriptor | Set payment descriptor on supported processors. |
| descriptor-phone | Set payment descriptor phone on supported processors. |
| descriptor-address | Set payment descriptor address on supported processors. |
| descriptor-city | Set payment descriptor city on supported processors. |
| descriptor-state | Set payment descriptor state on supported processors. |
| descriptor-postal | Set payment descriptor postal code on supported processors. |
| descriptor-country | Set payment descriptor country on supported processors. |
| descriptor-mcc | Set payment descriptor mcc on supported processors. |
| descriptor-merchant-id | Set payment descriptor merchant id on supported processors. |
| descriptor-url | Set payment descriptor url on supported processors. |
| currency | Set transaction currency.<br>Format: ISO 4217 |
| order-description | Order description. |
| customer-id | Customer identification. |
| customer-vault-id | Load customer details from an existing Customer Vault record. If set, no payment information is required during step two. |
| merchant-receipt-email | Send merchant receipt to email |
| customer-receipt | Send receipt if billing email included.<br>Values: 'true' or 'false' |
| merchant-defined-field-# | Merchant specified custom fields.<br>Format: <merchant-defined-field-1>Value</merchant-defined-field-1> |
| tracking-number | Shipping tracking number. |
| shipping-carrier | Shipping carrier.<br>Values: 'ups', 'fedex', 'dhl', or 'usps' |
| order-id\\*\\*\\* | Order id. |
| signature-image | Cardholder signature image. For use with "sale" and "auth" actions only.<br>Format: base64 encoded raw PNG image. (16kiB maximum) |
| po-number\\*\\*\\* | Cardholder's purchase order number. |
| tax-amount\\*\\*\\* | The sales tax included in the transaction amount associated with the purchase. Setting tax equal to any negative value indicates an order that is exempt from sales tax.<br>Default: '0.00'<br>Format: x.xx |
| shipping-amount\\*\\*\\* | Total shipping amount. |
| ship-from-postal\\*\\*\\*\* | Postal/ZIP code of the address from where purchased goods are being shipped. Defaults to merchant profile postal code. |
| summary-commodity-code\\*\\*\\*\* | A code representing the type of commodity being purchased. The acquirer or processor will provide a list of current codes. |
| duty-amount | Amount included in the transaction amount associated with the import of the purchased goods.<br>Default: '0.00' |
| discount-amount | Amount included in the transaction amount of any discount applied to the complete order by the merchant.<br>Default: '0.00' |
| national-tax-amount | The national tax amount included in the transaction amount.<br>Default: '0.00' |
| alternate-tax-amount | Second tax amount included in the transaction amount in countries where more than one type of tax can be applied to the purchases.<br>Default: '0.00' |
| alternate-tax-id | Tax identification number of the merchant that reported the alternate tax amount. |
| vat-tax-amount | Contains the amount of any value added taxes which can be associated with the purchased item.<br>Default: '0.00' |
| vat-tax-rate | Contains the tax rate used to calculate the sales tax amount appearing. Can contain up to 2 decimal places, ie 1% = 1.00.<br>Default: '0.00' |
| vat-invoice-reference-number | Invoice number that is associated with the VAT invoice. |
| customer-vat-registration | Value added tax registration number supplied by the cardholder. |
| merchant-vat-registration | Government assigned tax identification number of the merchant from whom the goods or services were purchased. |
| order-date | Purchase order date. Defaults to the date of the transaction.<br>Format: YYMMDD |
| skip-3ds | Skip over 3DS authentication process for this specific transaction.<br>Values: "true" or "false" |
| cardholder-auth† | 3D Secure condition. Value used to determine E-commerce indicator (ECI).<br>Values: 'verified' or 'attempted' |
| cavv† | Cardholder authentication verification value.<br>Format: base64 encoded |
| xid† | Cardholder authentication transaction id.<br>Format: base64 encoded |
| three-ds-version† | 3DSecure version.<br>Examples: "2.0.0" or "2.2.0" |
| directory-server-id | Directory Server Transaction ID. May be provided as part of 3DSecure 2.0 authentication.<br>Format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx |
| initiated-by | Who initiated the transaction.<br>Values: 'customer' or 'merchant' |
| initial-transaction-id | Original payment gateway transaction id. |
| stored-credential-indicator | The indicator of the stored credential.<br>Values: 'stored' or 'used'<br>Use **'stored'** when processing the initial transaction in which you are storing a customer's payment details (customer credentials) in the Customer Vault or other third-party payment storage system.<br>Use **'used'** when processing a subsequent or follow-up transaction using the customer payment details (customer credentials) you have already stored to the Customer Vault or third-party payment storage method. |
| dup-seconds‡ | Override duplicate transaction detection time in seconds. |
| avs-reject‡ | The transaction is rejected if the address verification result is a code in this list. Values are letters obtained under Settings->Address Verification in the control panel.<br>Format: x\|x\|x\|x... |
| cvv-reject‡ | The transaction is rejected if the card ID verification result is a code in this list. Values are letters obtained under Settings->Card ID Verification in the control panel.<br>Format: x\|x\|x\|x... |
| <billing> | The customer's billing information |
| billing-id | Specify billing id. Recommended when using Customer Vault hybrid action. Will be ignored if no hybrid add/update-customer is done. |
| first-name | Cardholder's first name. |
| last-name | Cardholder's last name. |
| address1 | Cardholder's billing address. |
| city | Card billing city. |
| state | Card billing state/province.<br>Format: CC |
| postal | Card billing postal code. |
| country | Card billing country code.<br>Format: CC/ISO 3166 |
| phone | Billing phone number. |
| email | Billing email address. |
| company | Cardholder's company. |
| address2 | Card billing address, line 2. |
| fax | Billing fax number. |
| account-type§ | The customer's ACH account type.<br>Values: 'checking' or 'savings' |
| entity-type§ | The customer's ACH account entity.<br>Values: 'personal' or 'business' |
| </billing> |
| <shipping> | The customer's shipping information. |
| shipping-id | Specify shipping id. Recommended when using Customer Vault hybrid action. Will be ignored if no hybrid add/update-customer is done. |
| first-name | Shipping first name. |
| last-name | Shipping last name. |
| address1 | Shipping billing address. |
| city | Shipping city. |
| state | Shipping state/province.<br>Format: CC |
| postal\\*\\*\\*\* | Shipping postal code. |
| country\\*\\*\\*\* | Shipping country code.<br>Format: CC/ISO 3166 |
| phone | Shipping phone number. |
| email | Shipping email address. |
| company | Shipping company. |
| address2 | Shipping address, line 2. |
| fax | Shipping fax number. |
| </shipping> |
| <product> | Product line item detail. Multiple product elements are allowed. |
| product-code\*\*\*\*¶ | Merchant defined description code of the item being purchased. |
| description\\*\\*\\*\* | Description of the item(s) being supplied. |
| commodity-code\\*\\*\\*\* | International description code of the individual good or service being supplied. The acquirer or processor will provide a list of current codes. |
| unit-of-measure\\*\\*\\*\* | Code for units of measurement as used in international trade.<br>Default: 'EACH' |
| unit-cost\\*\\*\\*\* | Unit cost of item purchased. May contain up to 4 decimal places. |
| quantity\\*\\*\\*\* | Quantity of the item(s) being purchased.<br>Default: '1' |
| total-amount\\*\\*\\*\* | Purchase amount associated with the item. Default to 'unit-cost' x 'quantity' rounded to the nearest penny. |
| tax-amount\\*\\*\\*\* | Amount of sales tax on specific item. Amount should not be included in item-total-amount.<br>Default: '0.00'<br>Format: x.xx |
| tax-rate\\*\\*\\*\* | Percentage representing the value-added tax applied. 1% = 1.00.<br>Default: '0.00' |
| discount-amount | Discount amount which can have been applied by the merchant on the sale of the specific item. Amount should not be included in 'item-total-amount'. |
| discount-rate | Discount rate for the line item. 1% = 1.00.<br>Default: '0.00' |
| tax-type | Type of value-added taxes that are being used. |
| alternate-tax-id | Tax identification number of the merchant that reported the alternate tax amount. |
| </product> |
| <add-subscription> | Perform a simultaneous 'hybrid' recurring action while processing a transaction. |
| start-date | The first day that the customer will be charged. Format: YYYYMMDD |
| <plan> |
| plan-id | The unique plan ID that references only this recurring plan. |
| payments | The number of payments before the recurring plan is complete.<br>Note: Use '0' for 'until canceled' |
| amount | The plan amount to be charged each billing cycle.<br>Format: x.xx |
| day-frequency | How often, in days, to charge the customer. Cannot be set with 'month-frequency' or 'day-of-month'. |
| month-frequency | How often, in months, to charge the customer. Cannot be set with 'day-frequency'. Must be set with 'day-of-month'.<br>Values: 1 through 24 |
| day-of-month | The day that the customer will be charged. Cannot be set with 'day-frequency'. Must be set with 'month-frequency'.<br>Values: 1 through 31 - for months without 29, 30, or 31 days, the charge will be on the last day |
| </plan> |
| </add-subscription> |
| <add-customer\|update-customer> | Perform a simultaneous 'hybrid' Customer Vault action while processing a transaction. This tag can be blank if submitting an 'add-customer' without specifying a 'customer-vault-id'. |
| customer-vault-id | Specify Customer Vault id. If omitted, will be auto-generated and returned in response. Required for 'update-customer'. |
| </add-customer\|update-customer> |
| partial-payments†† | Specify whether a partial amount or full amount of the transaction should be settled.<br>Format: 'settle\_partial' or 'payment\_in\_full' |
| partial-payment-id†† | Specify a partial payment ID. Required to collect an additional amount associated with an existing Partial Payment Transaction. Do not use on initial transaction. |
| Payment Facilitator Specific Fields |
| payment-facilitator-id‡‡‡ | Payment Facilitator/Aggregator/ISO's ID Number |
| submerchant-id‡‡‡ | Sub-merchant Account ID |
| submerchant-name‡‡‡ | Sub-merchant's Name |
| submerchant-address‡‡‡ | Sub-merchant's Address |
| submerchant-city‡‡‡ | Sub-merchant's City |
| submerchant-state‡‡‡ | Sub-merchant's State |
| submerchant-postal‡‡‡ | Sub-merchant's Zip/Postal Code |
| submerchant-country‡‡‡ | Sub-merchant's Country |
| submerchant-phone‡‡‡ | Sub-merchant's Phone Number |
| submerchant-email‡‡‡ | Sub-merchant's Email Address |
| submerchant-url‡‡‡ | Sub-merchant's URL |
| submerchant-airn‡‡‡ | Sub-merchant's Acquirer Internal Reference Number, used for Discover transactions |
| </sale\|auth\|credit\|validate\|offline> |

|     |     |
| --- | --- |
| \* | Always required |
| \*\* | Required for offline transactions |
| \\*\\*\\* | Required for Level 2 and Level 3 transactions |
| \\*\\*\\*\* | Required for Level 3 transactions |
| † | Required for 3D-Secure transactions |
| ‡ | Required for Override transactions |
| †† | Required for Partial Payment Transactions |
| § | Required for ACH transactions |
| ¶ | Required for Line Item Reporting |
| ‡‡‡ | Required fields for Payment Facilitator enabled transactions vary by card brand |

## Sale/Auth/Credit/Validate/Offline XML Response

| XML Element | Description |
| --- | --- |
| <response> |
| result | 1=Approved<br> 2=Declined<br> 3=Error in transaction data or system error |
| result-text | Textual response. |
| transaction-id | Payment Gateway transaction id. |
| result-code | Numeric mapping of processor responses. (See [Result Code Table](https://secure.easypaydirectgateway.com/gw/merchants/resources/integration/integration_portal.php#3step_appendix_3)) |
| form-url | URL used as the action of the HTML form in step two. |
| </response> |

# Step Two  Three-Step: Transactions

## HTML Form Fields Request

| HTML Form Fields | Description |
| --- | --- |
| billing-cc-number\* | Credit card number. |
| billing-cc-exp\* | Credit card expiration.<br>Format: MMYY |
| billing-cvv | Card security code. |
| billing-account-name\*\* | The name on the customer's ACH Account. |
| billing-account-number\*\* | The customer's bank account number. |
| billing-routing-number\*\* | The customer's bank routing number. |
| billing-account-type | The customer's ACH account type.<br>Values: 'checking' or 'savings' |
| billing-entity-type | The customer's ACH account entity.<br>Values: 'personal' or 'business' |
| billing-micr† | Physical check's Magnetic ink strip, on supported check processors. For use with 'POP' or 'ARC' sec-code. |
| billing-track-1\\*\\*\\* | Raw magnetic stripe data, track 1. |
| billing-track-2\\*\\*\\* | Raw magnetic stripe data, track 2. |
| billing-track-3\\*\\*\\* | Raw magnetic stripe data, track 3. |
| billing-magnesafe-track-1\\*\\*\\* | Raw MagTek Magensa encrypted reader data. |
| billing-magnesafe-track-2\\*\\*\\* | Raw MagTek Magensa encrypted reader data. |
| billing-magnesafe-track-3\\*\\*\\* | Raw MagTek Magensa encrypted reader data. |
| billing-magnesafe-ksn\\*\\*\\* | Raw MagTek Magensa encrypted reader data. |
| billing-magnesafe-magneprint\\*\\*\\* | Raw MagTek Magensa encrypted reader data. |
| billing-magnesafe-magneprint-status\\*\\*\\* | Raw MagTek Magensa encrypted reader data. |
| billing-social-security-number\\*\\*\\*\* | Customer's social security number, checked against bad check writers database if check verification is enabled. |
| billing-drivers-license-number\\*\\*\\*\* | Driver's license number, checked against bad check writers' database if check verification is enabled. |
| billing-drivers-license-dob\\*\\*\\*\* | Driver's license date of birth. |
| billing-drivers-license-state\\*\\*\\*\* | Customer's driver's license state.<br>Format: CC |
| billing-first-name | Cardholder's first name. Overwrites value if passed during step one. |
| billing-last-name | Cardholder's last name. Overwrites value if passed during step one.. |
| billing-address1 | Cardholder's billing address. Overwrites value if passed during step one. |
| billing-city | Card billing city. Overwrites value if passed during step one. |
| billing-state | Card billing state/province. Overwrites value if passed during step one.<br>Format: CC |
| billing-postal | Card billing postal code. Overwrites value if passed during step one. |
| billing-country | Card billing country code. Overwrites value if passed during step one.<br>Format: CC/ISO 3166 |
| billing-phone | Billing phone number. Overwrites value if passed during step one. |
| billing-email | Billing email address. Overwrites value if passed during step one. |
| billing-company | Cardholder's company. Overwrites value if passed during step one. |
| billing-address2 | Card billing address, line 2. Overwrites value if passed during step one. |
| billing-fax | Billing fax number. Overwrites value if passed during step one. |
| shipping-first-name | Shipping first name. Overwrites value if passed during step one. |
| shipping-last-name | Shipping last name. Overwrites value if passed during step one. |
| shipping-address1 | Shipping billing address. Overwrites value if passed during step one. |
| shipping-city | Shipping city. Overwrites value if passed during step one. |
| shipping-state | Shipping state/province. Overwrites value if passed during step one. |
| shipping-postal | Shipping postal code. Overwrites value if passed during step one. |
| shipping-country | Shipping country code. Overwrites value if passed during step one. |
| shipping-phone | Shipping phone number. Overwrites value if passed during step one. |
| shipping-email | Shipping email address. Overwrites value if passed during step one. |
| shipping-company | Shipping company. Overwrites value if passed during step one. |
| shipping-address2 | Shipping address, line 2. Overwrites value if passed during step one. |
| shipping-fax | Shipping fax number. Overwrites value if passed during step one. |

|     |     |
| --- | --- |
| \* | Required for keyed credit card transactions. |
| \*\* | Required for ACH transactions. |
| \\*\\*\\* | Used for retail transactions. Variables used dependent on swipe device. |
| \\*\\*\\*\* | Required for check verification. |
| † | Required for check scanning. |

## HTML Form Fields Response

Once the Payment Gateway has collected the customer's sensitive payment details, the customer's browser will immediately be redirected back to the redirect-url on your web server. A variable named token-id will be appended to the redirect-url in the GET query string as described below:

https://redirect-url/?token-id=\[token\]

# Step Three  Three-Step: Transactions

## Complete Transaction XML Request

| XML Element | Description |
| --- | --- |
| <complete-action> |
| api-key\* | api-key is obtained in the security keys section of the control panel settings. |
| token-id\* | Customer payment token returned during step two. |
| </complete-action> |

|     |     |
| --- | --- |
| \* | Required |

## Complete Transaction XML Response

| XML Element | Description |
| --- | --- |
| <response> |
| result | 1=Transaction Approved<br> 2=Transaction Declined<br> 3=Error in transaction data or system error |
| result-text | Textual response. |
| transaction-id | Payment Gateway transaction ID |
| result-code | Numeric mapping of processor responses. (See [Result Code Table](https://secure.easypaydirectgateway.com/gw/merchants/resources/integration/integration_portal.php#3step_appendix_3)) |
| authorization-code | Transaction authorization code. |
| avs-result | AVS response code. (See [AVS Response Codes](https://secure.easypaydirectgateway.com/gw/merchants/resources/integration/integration_portal.php#3step_appendix_1)) |
| cvv-result | CVV response code. (See [CVV Response Codes](https://secure.easypaydirectgateway.com/gw/merchants/resources/integration/integration_portal.php#3step_appendix_2)) |
| action-type | Action type that was initially specified.<br>Values: 'sale', 'auth', 'credit', 'validate', or 'offline' |
| amount | Total amount charged.<br>Format: x.xx |
| amount-authorized | Returns the amount authorized.<br>Format: x.xx |
| ip-address | Cardholder's IP address.<br>Format: xxx.xxx.xxx.xxx |
| industry | Industry classification of transaction.<br>Values: 'ecommerce', 'moto', or 'retail' |
| billing-method | Billing indicators used.<br>Values: 'recurring' or 'installment' |
| processor-id | Processor transaction was made through. |
| sec-code | ACH standard entry class codes.<br>Values: 'PPD', 'WEB', 'TEL', 'CCD', 'POP', or \\ARC' |
| descriptor | Payment descriptor. |
| descriptor-phone | Payment descriptor phone. |
| descriptor-address | Set payment descriptor address on supported processors. |
| descriptor-city | Set payment descriptor city on supported processors. |
| descriptor-state | Set payment descriptor state on supported processors. |
| descriptor-postal | Set payment descriptor postal code on supported processors. |
| descriptor-country | Set payment descriptor country on supported processors. |
| descriptor-mcc | Set payment descriptor mcc on supported processors. |
| descriptor-merchant-id | Set payment descriptor merchant id on supported processors. |
| descriptor-url | Set payment descriptor url on supported processors. |
| currency | Transaction currency used. (Table 1.b) |
| order-description | Order description. |
| customer-id | Customer identification. |
| customer-vault-id | Customer Vault id used or created during action. |
| merchant-receipt-email | Merchant receipt email. |
| customer-receipt | Customer email receipt sent.<br>Values: 'true' or 'false' |
| partial-payment-balance | Returns the payment's remaining balance. |
| partial-payment-id | Numeric identifier used to submit subsequent partial payment transactions. |
| merchant-defined-field-# | Merchant specified custom fields.<br>Format: <merchant-defined-field-1>Value</merchant-defined-field-1> |
| tracking-number | Shipping tracking number. |
| shipping-carrier | Shipping carrier.<br>Values: 'ups', 'fedex', 'dhl', or 'usps' |
| order-id | Order id. |
| po-number | Cardholder's purchase order number. |
| tax-amount | The sales tax included in the transaction amount associated with the purchase. Setting tax equal to any negative value indicates an order that is exempt from sales tax.<br>Default: '0.00'<br>Format: x.xx |
| shipping-amount | Total shipping amount.<br>Format: x.xx |
| ship-from-postal | Postal/ZIP code of the address from where purchased goods are being shipped. |
| summary-commodity-code | A code representing the type of commodity being purchased. The acquirer or processor will provide a list of current codes. |
| duty-amount | Amount included in the transaction amount associated with the import of the purchased goods.<br>Format: x.xx |
| discount-amount | Amount included in the transaction amount of any discount applied to the complete order by the merchant.<br>Format: x.xx |
| national-tax-amount | The national tax amount included in the transaction amount.<br>Format: x.xx |
| alternate-tax-amount | Second tax amount included in the transaction amount in countries where more than one type of tax can be applied to the purchases.<br>Default: '0.00'<br>Format: x.xx |
| alternate-tax-id | Tax identification number of the merchant that reported the alternate tax amount. |
| vat-tax-amount | Contains the amount of any value added taxes which can be associated with the purchased item.<br>Format: x.xx |
| vat-tax-rate | Contains the tax rate used to calculate the sales tax amount appearing. Can contain up to 2 decimal places, ie 1% = 1.00.<br>Format: x.xx |
| vat-invoice-reference-number | Invoice number that is associated with the VAT invoice. |
| customer-vat-registration | Value added tax registration number supplied by the cardholder. |
| merchant-vat-registration | Government assigned tax identification number of the merchant from whom the goods or services were purchased. |
| order-date | Purchase order date.<br>Format: YYMMDD |
| cardholder-auth | 3D Secure condition.<br>Values: 'verified' or 'attempted' |
| cavv | Cardholder authentication verification value.<br>Format: base64 encoded |
| xid | Cardholder authentication transaction id.<br>Format: base64 encoded |
| three-ds-version | 3DSecure version.<br>Examples: "2.0.0" or "2.2.0" |
| directory-server-id | Directory Server Transaction ID. May be provided as part of 3DSecure 2.0 authentication.<br>Format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx |
| eci | E-commerce Indicator.<br>Examples: "01", "02", "05", or "06" |
| dup-seconds | Override duplicate transaction detection checking in seconds. |
| avs-reject | Values are letters obtained under Settings->Address Verification in the control panel. |
| cvv-reject | Values are letters obtained under Settings->Card ID Verification in the control panel. |
| pinless-debit-override | Set to 'Y' if you have Pinless Debit Conversion enabled but want to opt out for this transaction. Feature applies to selected processors only. |
| <billing> | The customer's billing information |
| billing-id | Billing id used or created for this action. |
| first-name | Cardholder's first name. |
| last-name | Cardholder's last name. |
| address1 | Cardholder's billing address. |
| city | Card billing city. |
| state | Card billing state/province.<br>Format: CC |
| postal | Card billing postal code. |
| country | Card billing country code.<br>Format: CC/ISO 3166 |
| phone | Billing phone number. |
| email | Billing email address. |
| company | Cardholder's company. |
| address2 | Card billing address, line 2. |
| fax | Billing fax number. |
| social-security-number | Customer's social security number |
| drivers-license-number | Driver's license number. |
| drivers-license-dob | Driver's license date of birth. |
| drivers-license-state | Customer's driver's license state.<br>Format: CC |
| cc-number | Masked credit card number.<br>Format: XXXXXX\*\*\*\*\*\*\*\*XXXX |
| cc-exp | Credit card expiration<br>Format: MMYY |
| account-name | The name on the customer's bank account. |
| account-number | Masked bank account number.<br>Format: X\*\*\*\*XXXX |
| routing-number | Masked bank routing number.<br>Format: X\*\*\*\*XXXX |
| account-type | The customer's ACH account type.<br>Values: 'checking' or 'savings' |
| entity-type | The customer's ACH account entity.<br>Values: 'personal' or 'business' |
| priority | Billing id priority.<br>Format: Numeric, 1-255 |
| </billing> |
| <shipping> | The customer's shipping information. |
| shipping-id | Shipping id used or created for this action. Recommended when using Customer Vault hybrid action; will be ignored if no hybrid add/update-customer is done. |
| first-name | Shipping first name. |
| last-name | Shipping last name. |
| address1 | Shipping billing address. |
| city | Shipping city. |
| state | Shipping state/province.<br>Format: CC |
| postal | Shipping postal code. |
| country | Shipping country code.<br>Format: CC/ISO 3166 |
| phone | Shipping phone number. |
| email | Shipping email address. |
| company | Shipping company. |
| address2 | Shipping address, line 2. |
| fax | Shipping fax number. |
| priority | Shipping id priority.<br>Format: Numeric, 1-255 |
| </shipping> |
| <product> | Product line item detail. Multiple product elements are allowed. |
| product-code | Merchant defined description code of the item being purchased. |
| description | Description of the item(s) being supplied. |
| commodity-code | International description code of the individual good or service being supplied. The acquirer or processor will provide a list of current codes. |
| unit-of-measure | Code for unites of measurement as used in international trade. |
| unit-cost | Unit cost of item purchased. May contain up to 4 decimal places. |
| quantity | Quantity of the item(s) being purchased. |
| total-amount | Purchase amount associated with the item.<br>Format: x.xx |
| tax-amount | Amount of sales tax on specific item. Amount should not be included in item-total-amount.<br>Default: '0.00'<br>Format: x.xx |
| tax-rate | Percentage representing the value-added tax applied. 1% = 1.00.<br>Format: x.xx |
| discount-amount | Discount amount which can have been applied by the merchant on the sale of the specific item.<br>Format: x.xx |
| discount-rate | Discount rate for the line item. 1% = 1.00<br>Format: x.xx |
| tax-type | Type of value-added taxes that are being used. |
| alternate-tax-id | Tax identification number of the merchant that reported the alternate tax amount. |
| </product> |
| </response> |

# Additional Operations  Three-Step: Transactions

## Capture XML Request

| Element | Description |
| --- | --- |
| <capture> |
| api-key\* | api-key is obtained in the security keys section of the control panel settings. |
| transaction-id\* | Original Payment Gateway transaction id. |
| amount | Total amount to be settled, this amount may be equal to or less than the authorized amount. |
| merchant-defined-field-# | Merchant specified custom fields.<br>Format: <merchant-defined-field-1>Value</merchant-defined-field-1> |
| tracking-number | Shipping tracking number. |
| shipping-carrier | Shipping carrier used.<br>Values: 'ups', 'fedex', 'dhl', or 'usps' |
| order-id | Order ID. |
| signature-image | Cardholder signature image.<br>Format: base64 encoded raw PNG image. (16kiB maximum) |
| </capture> |

|     |     |
| --- | --- |
| \* | Required |

## Void XML Request

| Element | Description |
| --- | --- |
| <void> |
| api-key\* | api-key is obtained in the security keys section of the control panel settings. |
| transaction-id\* | Original Payment Gateway transaction id. |
| merchant-defined-field-# | Merchant specified custom fields.<br>Format: <merchant-defined-field-1>Value</merchant-defined-field-1> |
| </void> |

|     |     |
| --- | --- |
| \* | Required |

## Refund XML Request

| Element | Description |
| --- | --- |
| <refund> |
| api-key\* | api-key is obtained in the security keys section of the control panel settings. |
| transaction-id\* | Original Payment Gateway transaction id. |
| amount | Total amount to be refunded. This amount may be equal to or less than the settled amount. Setting the amount to 0.00 will refund the entire amount. |
| merchant-defined-field-# | Merchant specified custom fields.<br>Format: <merchant-defined-field-1>Value</merchant-defined-field-1> |
| </refund> |

|     |     |
| --- | --- |
| \* | Required |

## Update XML Request

| Element | Description |
| --- | --- |
| <update> |
| api-key\* | api-key is obtained in the security keys section of the control panel settings. |
| transaction-id\* | Original Payment Gateway transaction id. |
| merchant-defined-field-# | Merchant specified custom fields.<br>Format: <merchant-defined-field-1>Value</merchant-defined-field-1> |
| tracking-number | Shipping tracking number. |
| shipping-carrier | Shipping carrier used.<br>Values: 'ups', 'fedex', 'dhl', or 'usps' |
| order-id | Order ID. |
| signature-image | Cardholder signature image.<br>Format: base64 encoded raw PNG image. (16kiB maximum) |
| </update> |

|     |     |
| --- | --- |
| \* | Required |

## Complete Partial Payment XML Request

| Element | Description |
| --- | --- |
| <complete-partial-payment> |
| api-key\* | api-key is obtained in the security keys section of the control panel settings. |
| partial-payment-id\* | Specify a partial payment ID. Required to collect an additional amount associated with an existing Partial Payment Transaction. Do not use on initial transaction. |
| </complete-partial-payment> |

|     |     |
| --- | --- |
| \* | Required |

# Step One  Three-Step: Customer Vault

## Add/Update Customer XML Request

| XML Element | Description |
| --- | --- |
| <add-customer\|update-customer> | Type of transaction to perform. |
| api-key\* | api-key is obtained in the security keys section of the control panel settings. |
| redirect-url\* | A URL on your web server that the gateway will redirect your customer to after sensitive data collection. Value is not required for 'update-customer' requests when sensitive data is not being presented.<br>Example: Updating an address or zip code only. |
| customer-vault-id | Load customer details from an existing Customer Vault record. If set, no payment information is required during step two. |
| merchant-defined-field-# | Merchant specified custom fields.<br>Format: <merchant-defined-field-1>Value</merchant-defined-field-1> |
| source-transaction-id | Specifies a payment gateway transaction id in order to associate payment information with a Customer Vault record. |
| <billing> | The customer's billing information |
| billing-id | Specify billing id. Required for 'update-customer' if multiple billing-ids exist, optional for 'add-billing'. |
| first-name | Cardholder's first name. |
| last-name | Cardholder's last name. |
| address1 | Cardholder's billing address. |
| city | Card billing city. |
| state | Card billing state/province.<br>Format: CC |
| postal | Card billing postal code. |
| country | Card billing country code.<br>Format: CC/ISO 3166 |
| phone | Billing phone number. |
| email | Billing email address. |
| company | Cardholder's company. |
| address2 | Card billing address, line 2. |
| fax | Billing fax number. |
| account-type | The customer's ACH account type.<br>Values: 'checking' or 'savings' |
| entity-type | The customer's ACH account entity.<br>Values: 'personal' or 'business' |
| priority | Specify priority (If omitted, will be auto-generated and returned in response).<br>Format: Numeric, 1-255 |
| </billing> |
| <shipping> | The customer's shipping information. |
| shipping-id | Specify shipping id (Required for update-customer if multiple shipping-ids exist. Optional for add-billing). |
| first-name | Shipping first name. |
| last-name | Shipping last name. |
| address1 | Shipping billing address. |
| city | Shipping city. |
| state | Shipping state/province.<br>Format: CC |
| postal | Shipping postal code. |
| country | Shipping country code.<br>Format: CC/ISO 3166 |
| phone | Shipping phone number. |
| email | Shipping email address. |
| company | Shipping company. |
| address2 | Shipping address, line 2. |
| fax | Shipping fax number. |
| priority | Specify priority, if omitted, will be auto-generated and returned in response.<br>Format: Numeric, 1-255 |
| </shipping> |
| </add-customer\|update-customer> |

|     |     |
| --- | --- |
| \* | Required |

## XML Response

| XML Element | Description |
| --- | --- |
| <response> |
| result | 1=Approved<br> 2=Declined<br> 3=Error in transaction data or system error |
| result-text | Textual response. |
| result-code | Numeric mapping of processor responses. (See [Result Code Table](https://secure.easypaydirectgateway.com/gw/merchants/resources/integration/integration_portal.php#3step_appendix_3)) |
| form-url | URL used as the action of the HTML form in step two. |
| </response> |

# Step Two  Three-Step: Customer Vault

## HTML Form Fields Request

| HTML Form Fields | Description |
| --- | --- |
| billing-cc-number\* | Credit card number. |
| billing-cc-exp\* | Credit card expiration.<br>Format: MMYY |
| billing-cvv | Card security code. |
| billing-account-name\*\* | The name on the customer's ACH Account. |
| billing-account-number\*\* | The customer's bank account number. |
| billing-routing-number\*\* | The customer's bank routing number. |
| billing-account-type | The customer's ACH account type.<br>Values: 'checking' or 'savings' |
| billing-entity-type | The customer's ACH account entity.<br>Values: 'personal' or 'business' |
| billing-micr† | Physical check's Magnetic ink strip, on supported check processors. For use with 'POP' or 'ARC' sec-code. |
| billing-track-1\\*\\*\\* | Raw magnetic stripe data, track 1. |
| billing-track-2\\*\\*\\* | Raw magnetic stripe data, track 2. |
| billing-track-3\\*\\*\\* | Raw magnetic stripe data, track 3. |
| billing-magnesafe-track-1\\*\\*\\* | Raw MagTek Magensa encrypted reader data. |
| billing-magnesafe-track-2\\*\\*\\* | Raw MagTek Magensa encrypted reader data. |
| billing-magnesafe-track-3\\*\\*\\* | Raw MagTek Magensa encrypted reader data. |
| billing-magnesafe-ksn\\*\\*\\* | Raw MagTek Magensa encrypted reader data. |
| billing-magnesafe-magneprint-status\\*\\*\\* | Raw MagTek Magensa encrypted reader data. |
| billing-social-security-number\\*\\*\\*\* | Customer's social security number (Checked against bad check writers database if check verification is enabled). |
| billing-drivers-license-number\\*\\*\\*\* | Driver's license number (Checked against bad check writers database if check verification is enabled). |
| billing-drivers-license-dob\\*\\*\\*\* | Driver's license date of birth. |
| billing-drivers-license-state\\*\\*\\*\* | Customer's driver's license state.<br>Format: CC |
| billing-first-name | Cardholder's first name, overwrites value if passed during step one. |
| billing-last-name | Cardholder's last name, overwrites value if passed during step one. |
| billing-address1 | Cardholder's billing address, overwrites value if passed during step one. |
| billing-city | Card billing city, overwrites value if passed during step one. |
| billing-state | Card billing state/province, overwrites value if passed during step one.<br>Format: CC |
| billing-postal | Card billing postal code, overwrites value if passed during step one. |
| billing-country | Card billing country code, overwrites value if passed during step one.<br>Format: CC/ISO 3166 |
| billing-phone | Billing phone number, overwrites value if passed during step one. |
| billing-email | Billing email address, overwrites value if passed during step one. |
| billing-company | Cardholder's company, overwrites value if passed during step one. |
| billing-address2 | Card billing address, line 2, overwrites value if passed during step one. |
| billing-fax | Billing fax number, overwrites value if passed during step one. |
| shipping-first-name | Shipping first name, overwrites value if passed during step one. |
| shipping-last-name | Shipping last name, overwrites value if passed during step one. |
| shipping-address1 | Shipping billing address, overwrites value if passed during step one. |
| shipping-city | Shipping city, overwrites value if passed during step one. |
| shipping-state | Shipping state/province, overwrites value if passed during step one.<br>Format: CC |
| shipping-postal | Shipping postal code, overwrites value if passed during step one. |
| shipping-country | Shipping country code, overwrites value if passed during step one.<br>Format: CC/ISO 3166 |
| shipping-phone | Shipping phone number, overwrites value if passed during step one. |
| shipping-email | Shipping email address, overwrites value if passed during step one. |
| shipping-company | Shipping company, overwrites value if passed during step one. |
| shipping-address2 | Shipping address, line 2, overwrites value if passed during step one. |
| shipping-fax | Shipping fax number, overwrites value if passed during step one. |

|     |     |
| --- | --- |
| \* | Required for keyed credit card transactions. |
| \*\* | Required for ACH transactions. |
| \\*\\*\\* | Used for retail transactions. Variables used dependent on swipe device. |
| \\*\\*\\*\* | Required for check verification. |
| † | Required for check scanning. |

### HTML Form Fields Response

Once the Payment Gateway has collected the customer's sensitive payment details, the customer's browser will immediately be redirected back to the redirect-url on your web server. A variable named token-id will be appended to the redirect-url in the GET query string as described below:

https://redirect-url/?token-id=\[token\]

# Step Three  Three-Step: Customer Vault

## Complete Action XML Request

| XML Element | Description |
| --- | --- |
| <complete-action> |
| api-key\* | api-key is obtained in the security keys section of the control panel settings. |
| token-id\* | Customer payment token returned during step two. |
| </complete-action> |

|     |     |
| --- | --- |
| \* | Required |

## Complete Action XML Response

| XML Element | Description |
| --- | --- |
| <response> |
| result | 1=Transaction Approved<br> 2=Transaction Declined<br> 3=Error in transaction data or system error |
| result-text | Textual response. |
| result-code | Numeric mapping of processor responses. (See [Result Code Table](https://secure.easypaydirectgateway.com/gw/merchants/resources/integration/integration_portal.php#3step_appendix_3)) |
| action-type | Action type that was initially specified.<br>Values: 'sale', 'auth', 'credit', 'validate', or 'offline' |
| customer-vault-id | Customer Vault id used or created during action. |
| merchant-defined-field-# | Merchant specified custom fields.<br>Format: <merchant-defined-field-1>Value</merchant-defined-field-1> |
| <billing> | The customer's billing information. |
| billing-id | Billing id used or created for this action. |
| first-name | Cardholder's first name. |
| last-name | Cardholder's last name. |
| address1 | Cardholder's billing address. |
| city | Card billing city. |
| state | Card billing state/province.<br>Format: CC |
| postal | Card billing postal code. |
| country | Card billing country code.<br>Format: CC/ISO 3166 |
| phone | Billing phone number. |
| email | Billing email address. |
| company | Cardholder's company. |
| address2 | Card billing address, line 2. |
| fax | Billing fax number. |
| social-security-number | Customer's social security number |
| drivers-license-number | Driver's license number. |
| drivers-license-dob | Driver's license date of birth. |
| drivers-license-state | Customer's driver's license state.<br>Format: CC |
| cc-number | Masked credit card number.<br>Format: XXXXXX\*\*\*\*\*\*\*\*XXXX |
| cc-exp | Credit card expiration.<br>Format: MMYY |
| account-name | The name on the customer's bank account. |
| account-number | Masked bank account number.<br>Format: X\*\*\*\*XXXX |
| routing-number | Masked bank routing number.<br>Format: X\*\*\*\*XXXX |
| account-type | The customer's ACH account type.<br>Values: 'checking' or 'savings' |
| entity-type | The customer's ACH account entity.<br>Values: 'personal' or 'business' |
| priority | Billing id priority.<br>Format: Numeric, 1-255 |
| </billing> |
| <shipping> | The customer's shipping information. |
| shipping-id | Shipping id used or created during action. |
| first-name | Shipping first name. |
| last-name | Shipping last name. |
| address1 | Shipping billing address. |
| city | Shipping city. |
| state | Shipping state/province.<br>Format: CC |
| postal | Shipping postal code. |
| country | Shipping country code.<br>Format: CC/ISO 3166 |
| phone | Shipping phone number. |
| email | Shipping email address. |
| company | Shipping company. |
| address2 | Shipping address, line 2. |
| fax | Shipping fax number. |
| priority | Shipping id priority.<br>Format: Numeric, 1-255 |
| </shipping> |
| </response> |

# Additional Operations  Three-Step: Customer Vault

## Add/Update Billing Request (Step 1)

| XML Element | Description |
| --- | --- |
| <add-billing\|update-billing> | Type of transaction to perform. |
| api-key\* | api-key is obtained in the security keys section of the control panel settings. |
| redirect-url\* | A URL on your web server that the gateway will redirect your customer to after sensitive data collection. Value is not required for 'update-billing' requests when sensitive data is not presented.<br>Example: Updating an address or zip code only. |
| customer-vault-id\* | Load customer details from an existing Customer Vault record . If set, no payment information is required during step two. |
| <billing> | The customer's billing information |
| billing-id | Specify billing id. Required for update-customer if multiple billing ids exist, optional for add-billing. |
| first-name | Cardholder's first name. |
| last-name | Cardholder's last name. |
| address1 | Cardholder's billing address. |
| city | Card billing city. |
| state | Card billing state/province.<br>Format: CC |
| postal | Card billing postal code. |
| country | Card billing country code.<br>Format: CC/ISO 3166 |
| phone | Billing phone number. |
| email | Billing email address. |
| company | Cardholder's company. |
| address2 | Card billing address, line 2. |
| fax | Billing fax number. |
| account-type | The customer's ACH account type.<br>Values: 'checking' or 'savings' |
| entity-type | The customer's ACH account entity.<br>Values: 'personal' or 'business' |
| priority | Specify priority (If omitted, will be auto-generated and returned in response.)<br>Format: Numeric, 1-255 |
| </billing> |
| </add-billing\|update-billing> |

|     |     |
| --- | --- |
| \* | Required |

## Customer Vault initiated Sale/Auth/Credit/Validate/Offline XML Request

| Element | Description |
| --- | --- |
| <sale\|auth\|credit\|validate\|offline> | Any and all optional fields described here can be appended to this request. |
| api-key\* | api-key is obtained in the security keys section of the control panel settings. |
| amount\* | Total amount to be charged (For "validate" actions, amount must be 0.00 or omitted).<br>Format: x.xx |
| surcharge-amount | Surcharge amount.<br>Format: x.xx |
| authorization-code | Specify authorization code. For use with "offline" action only. |
| processor-id | If using multiple MIDs, route to this processor. The values for 'processor-id' are obtained under 'Settings'->'Transaction Routing' in the Control Panel. |
| customer-vault-id\* | Load customer details from an existing Customer Vault record . |
| signature-image | Cardholder signature image. For use with "sale" and "auth" actions only.<br>Format: base64 encoded raw PNG image. (16kiB maximum) |
| <billing> | The customer's billing information. |
| billing-id | Load Billing ID details from an existing Billing record. If not set, the billing-id with the highest priority will be used by default. |
| </billing> |
| <shipping> | The customer's shipping information. |
| shipping-id | Load shipping id details from an existing shipping record. If unset, the shipping-id with the highest priority will be used by default. |
| </shipping> |
| </sale\|auth\|credit\|validate\|offline> |

|     |     |
| --- | --- |
| \* | Required |

## Delete Customer XML Request

| Element | Description |
| --- | --- |
| <delete-customer> |
| api-key\* | api-key is obtained in the security keys section of the control panel settings. |
| customer-vault-id\* | Specify customer to be deleted. |
| </delete-customer> |

|     |     |
| --- | --- |
| \* | Required |

## Delete Billing XML Request

| Element | Description |
| --- | --- |
| <delete-billing> |
| api-key\* | api-key is obtained in the security keys section of the control panel settings. |
| customer-vault-id\* | Load customer details from an existing Customer Vault record . If set, no payment information is required during step two. |
| <billing> |
| billing-id\* | Specify billing id to delete. |
| </billing> |
| </delete-billing> |

|     |     |
| --- | --- |
| \* | Required |

## Add/Update/Delete Shipping XML Request

These requests can be made the by replacing the billing section with shipping

# Step One  Three-Step: Recurring

## Add Subscription to an Existing Plan

| Element | Description |
| --- | --- |
| <add-subscription> | Associate payment information with a recurring plan. |
| api-key\* | api-key is obtained in the Security Keys section of the Control Panel Settings. |
| redirect-url\* | A URL on your web server that the gateway will redirect your customer to after sensitive data collection. Value is not required when sensitive data is not presented.<br>Example: Adding a Subscription using a Customer Vault ID. |
| customer-vault-id | Load customer details from an existing Customer Vault record . If set, no payment information is required during step two. |
| start-date | The first day that the customer will be charged.<br>Format: YYYYMMDD |
| order-id | Order id. |
| po-number | Cardholder's purchase order number. |
| order-description | Order description. |
| currency | Set transaction currency.<br>Format: ISO 4217 |
| tax-amount | The sales tax included in the transaction amount associated with the purchase. Setting tax equal to any negative value indicates an order that is exempt from sales tax.<br>Default: 0.00'<br>Format: x.xx |
| shipping-amount | Total shipping amount. |
| merchant-defined-field-# | Merchant specified custom fields.<br>Format: <merchant-defined-field-1>Value</merchant-defined-field-1> |
| source-transaction-id | Specifies a payment gateway transaction id in order to associate payment information with a Subscription record. |
| <plan> |
| plan-id\* | The unique plan ID that references only this recurring plan. |
| </plan> |
| <billing> | The customer's billing information |
| billing-id | Specify billing id. Recommended when using Customer Vault hybrid action. Will be ignored if no hybrid add/update-customer is done. |
| first-name | Cardholder's first name. |
| last-name | Cardholder's last name. |
| address1 | Cardholder's billing address. |
| city | Card billing city. |
| state | Card billing state/province.<br>Format: CC |
| postal | Card billing postal code. |
| country | Card billing country code.<br>Format: CC/ISO 3166 |
| phone | Billing phone number. |
| email | Billing email address. |
| company | Cardholder's company. |
| address2 | Card billing address, line 2. |
| fax | Billing fax number. |
| account-type\*\* | The customer's ACH account type.<br>Values: 'checking' or 'savings' |
| entity-type\*\* | The customer's ACH account entity.<br>Values: 'personal' or 'business' |
| </billing> |
| <shipping> | The customer's shipping information. |
| shipping-id | Specify shipping id. Recommended when using Customer Vault hybrid action. Will be ignored if no hybrid add/update-customer is done. |
| first-name | Shipping first name. |
| last-name | Shipping last name. |
| address1 | Shipping address. |
| city | Shipping city. |
| state | Shipping state/province.<br>Format: CC |
| postal | Shipping postal code. |
| country | Shipping country code.<br>Format: CC/ISO 3166 |
| phone | Shipping phone number. |
| email | Shipping email address. |
| company | Shipping company. |
| address2 | Shipping address, line 2. |
| fax | Shipping fax number. |
| </shipping> |
| </add-subscription> |

|     |     |
| --- | --- |
| \* | Always required |
| \*\* | Required for ACH transactions |

## Add Subscription to a Custom Plan

| Element | Description |
| --- | --- |
| <add-subscription> | Associate payment information with a recurring plan. |
| api-key\* | api-key is obtained in the Security Keys section of the Control Panel Settings. |
| redirect-url\* | A URL on your web server that the gateway will redirect your customer to after sensitive data collection. Value is not required when sensitive data is not presented.<br>Example: Adding a Subscription using a Customer Vault ID. |
| customer-vault-id | Load customer details from an existing Customer Vault record . If set, no payment information is required during step two. |
| start-date | The first day that the customer will be charged.<br>Format: YYYYMMDD |
| order-id | Order id. |
| po-number | Cardholder's purchase order number. |
| order-description | Order description. |
| currency | Set transaction currency.<br>Format: ISO 4217 |
| tax-amount | The sales tax included in the transaction amount associated with the purchase. Setting tax equal to any negative value indicates an order that is exempt from sales tax.<br>Default: '0.00'<br>Format: x.xx |
| shipping-amount | Total shipping amount. |
| merchant-defined-field-# | Merchant specified custom fields.<br>Format: <merchant-defined-field-1>Value</merchant-defined-field-1> |
| source-transaction-id | Specifies a payment gateway transaction id in order to associate payment information with a Subscription record. |
| <plan> |
| payments\* | The number of payments before the recurring plan is complete.<br>Notes: '0' for until canceled |
| amount\* | The plan amount to be charged each billing cycle.<br>Format: x.xx |
| day-frequency\\*\\*\\* | How often, in days, to charge the customer. Cannot be set with 'month-frequency' or 'day-of-month'. |
| month-frequency\\*\\*\\*\* | How often, in months, to charge the customer. Cannot be set with 'day-frequency'. Must be set with 'day-of-month'.<br>Values: 1 through 24 |
| day-of-month\\*\\*\\*\* | The day that the customer will be charged. Cannot be set with 'day-frequency'. Must be set with 'month-frequency'.<br>Values: 1 through 31 - for months without 29, 30, or 31 days, the charge will be on the last day |
| </plan> |
| <billing> | The customer's biling information |
| billing-id | Specify billing id. Recommended when using Customer Vault hybrid action. Will be ignored if no hybrid add/update-customer is done. |
| first-name | Cardholder's first name. |
| last-name | Cardholder's last name. |
| address1 | Cardholder's billing address. |
| city | Card billing city. |
| state | Card billing state/province.<br>Format: CC |
| postal | Card billing postal code. |
| country | Card billing country code.<br>Format: CC/ISO 3166 |
| phone | Billing phone number. |
| email | Billing email address. |
| company | Cardholder's company. |
| address2 | Card billing address, line 2. |
| fax | Billing fax number. |
| account-type\*\* | The customer's ACH account type.<br>Values: 'checking' or 'savings' |
| entity-type\*\* | The customer's ACH account entity.<br>Values: 'personal' or 'business' |
| </billing> |
| <shipping> | The customer's shipping information. |
| shipping-id | Specify shipping id. Recommended when using Customer Vault hybrid action. Will be ignored if no hybrid add/update-customer is done. |
| first-name | Shipping first name. |
| last-name | Shipping last name. |
| address1 | Shipping address. |
| city | Shipping city. |
| state | Shipping state/province.<br>Format: CC |
| postal | Shipping postal code. |
| country | Shipping country code.<br>Format: CC/ISO 3166 |
| phone | Shipping phone number. |
| email | Shipping email address. |
| company | Shipping company. |
| address2 | Shipping address, line 2. |
| fax | Shipping fax number. |
| </shipping> |
| </add-subscription> |

|     |     |
| --- | --- |
| \* | Always required |
| \*\* | Required for ACH transactions |
| \\*\\*\\* | Required unless 'month-frequency' and 'day-of-month' is set. |
| \\*\\*\\*\* | Required unless 'day-frequency' is set. |

## Update Subscription Information

| Element | Description |
| --- | --- |
| <update-subscription> | Update Customer's information for a subscription. |
| api-key\* | api-key is obtained in the Security Keys section of the Control Panel Settings. |
| redirect-url\* | A URL on your web server that the gateway will redirect your customer to after sensitive data collection. Value is not required when sensitive data is not presented.<br>Example: Updating a Subscription using a Customer Vault ID. |
| subscription-id\* | The subscription that will be updated. |
| order-id | Order id. |
| po-number | Cardholder's purchase order number. |
| order-description | Order description. |
| currency | Set transaction currency.<br>Format: ISO 4217 |
| merchant-defined-field-# | Merchant specified custom fields.<br>Format: <merchant-defined-field-1>Value</merchant-defined-field-1> |
| <billing> | The customer's billing information |
| first-name | Cardholder's first name. |
| last-name | Cardholder's last name. |
| address1 | Cardholder's billing address. |
| city | Card billing city. |
| state | Card billing state/province.<br>Format: CC |
| postal | Card billing postal code. |
| country | Card billing country code.<br>Format: CC/ISO 3166 |
| phone | Billing phone number. |
| email | Billing email address. |
| company | Cardholder's company. |
| address2 | Card billing address, line 2. |
| fax | Billing fax number. |
| account-type\*\* | The customer's ACH account type.<br>Values: 'checking' or 'savings' |
| entity-type\*\* | The customer's ACH account entity.<br>Values: 'personal' or 'business' |
| </billing> |
| <shipping> | The customer's shipping information. |
| first-name | Shipping first name. |
| last-name | Shipping last name. |
| address1 | Shipping address. |
| city | Shipping city. |
| state | Shipping state/province.<br>Format: CC |
| postal | Shipping postal code. |
| country | Shipping country code.<br>Format: CC/ISO 3166 |
| phone | Shipping phone number. |
| email | Shipping email address. |
| company | Shipping company. |
| address2 | Shipping address, line 2. |
| fax | Shipping fax number. |
| </shipping> |
| </update-subscription> |

|     |     |
| --- | --- |
| \* | Always Required. |
| \*\* | Required for ACH subscriptions. |

# Step Two  Three-Step: Recurring

## HTML Form Fields Request

| HTML Form Fields | Description |
| --- | --- |
| billing-cc-number\* | Credit card number. |
| billing-cc-exp\* | Credit card expiration.<br>Format: MMYY |
| billing-cvv | Card security code. |
| billing-account-name\*\* | The name on the customer's ACH Account. |
| billing-account-number\*\* | The customer's bank account number. |
| billing-routing-number\*\* | The customer's bank routing number. |
| billing-account-type | The customer's ACH account type.<br>Values: 'checking' or 'savings' |
| billing-entity-type | The customer's ACH account entity.<br>Values: 'personal' or 'business' |
| billing-micr† | Physical check's Magnetic ink strip, on supported check processors. For use with 'POP' or 'ARC' sec-code. |
| billing-track-1\\*\\*\\* | Raw magnetic stripe data, track 1. |
| billing-track-2\\*\\*\\* | Raw magnetic stripe data, track 2. |
| billing-track-3\\*\\*\\* | Raw magnetic stripe data, track 3. |
| billing-magnesafe-track-1\\*\\*\\* | Raw MagTek Magensa encrypted reader data. |
| billing-magnesafe-track-2\\*\\*\\* | Raw MagTek Magensa encrypted reader data. |
| billing-magnesafe-track-3\\*\\*\\* | Raw MagTek Magensa encrypted reader data. |
| billing-magnesafe-ksn\\*\\*\\* | Raw MagTek Magensa encrypted reader data. |
| billing-magnesafe-magneprint-status\\*\\*\\* | Raw MagTek Magensa encrypted reader data. |
| billing-social-security-number\\*\\*\\*\* | Customer's social security number, checked against bad check writers database if check verification is enabled. |
| billing-drivers-license-number\\*\\*\\*\* | Drivers license number, checked against bad check writers database if check verification is enabled. |
| billing-drivers-license-dob\\*\\*\\*\* | Drivers license date of birth. |
| billing-drivers-license-state\\*\\*\\*\* | Customer's drivers license state.<br>Format: CC |
| billing-first-name | Cardholder's first name. Overwrites value if passed during step one. |
| billing-last-name | Cardholder's last name. Overwrites value if passed during step one. |
| billing-address1 | Cardholder's billing address. Overwrites value if passed during step one. |
| billing-city | Card billing city. Overwrites value if passed during step one. |
| billing-state | Card billing state/province. Overwrites value if passed during step one.<br>Format: CC |
| billing-postal | Card billing postal code. Overwrites value if passed during step one. |
| billing-country | Card billing country code. Overwrites value if passed during step one.<br>Format: CC/ISO 3166 |
| billing-phone | Billing phone number. Overwrites value if passed during step one. |
| billing-email | Billing email address. Overwrites value if passed during step one. |
| billing-company | Cardholder's company. Overwrites value if passed during step one. |
| billing-address2 | Card billing address, line 2. Overwrites value if passed during step one. |
| billing-fax | Billing fax number. Overwrites value if passed during step one. |
| shipping-first-name | Shipping first name. Overwrites value if passed during step one. |
| shipping-last-name | Shipping last name. Overwrites value if passed during step one. |
| shipping-address1 | Shipping address. Overwrites value if passed during step one. |
| shipping-city | Shipping city. Overwrites value if passed during step one. |
| shipping-state | Shipping state/province. Overwrites value if passed during step one. |
| shipping-postal | Shipping postal code. Overwrites value if passed during step one. |
| shipping-country | Shipping country code. Overwrites value if passed during step one. |
| shipping-phone | Shipping phone number. Overwrites value if passed during step one. |
| shipping-email | Shipping email address. Overwrites value if passed during step one. |
| shipping-company | Shipping company. Overwrites value if passed during step one. |
| shipping-address2 | Shipping address, line 2. Overwrites value if passed during step one. |
| shipping-fax | Shipping fax number. Overwrites value if passed during step one. |

|     |     |
| --- | --- |
| \* | Required for keyed credit card transactions. |
| \*\* | Required for ACH transactions. |
| \\*\\*\\* | Used for retail transactions. Variables used dependant on swipe device. |
| \\*\\*\\*\* | Required for check verification. |
| † | Required for check scanning. |

## HTML Form Fields Response

Once the Payment Gateway has collected the customer's sensitive payment details, the customer's browser will immediately be redirected back to the redirect-url on your web server. A variable named token-id will be appended to the redirect-url in the GET query string as described below:

https://redirect-url/?token-id=\[token\]

# Step Three  Three-Step: Recurring

## Complete Action XML Request

| XML Element | Description |
| --- | --- |
| <complete-action> |
| api-key\* | api-key is obtained in the security keys section of the control panel settings. |
| token-id\* | Customer payment token returned during step two. |
| </complete-action> |

|     |     |
| --- | --- |
| \* | Required |

## Complete Action XML Response

| XML Element | Description |
| --- | --- |
| response |
| result | 1=Transaction Approved<br> 2=Transction Declined<br> 3=Error in transaction data or system error |
| result-text | Textual response. |
| result-code | Numeric mapping of processor responses. (See [Result Code Table](https://secure.easypaydirectgateway.com/gw/merchants/resources/integration/integration_portal.php#3step_appendix_3)) |
| action-type | Action type that was initially specified.<br>Values: 'sale', 'auth', 'credit', 'validate', or 'offline' |
| subscription-id | Subscription ID used or created during action. |
| merchant-defined-field-# | Merchant specified custom fields.<br>Format: <merchant-defined-field-1>Value</merchant-defined-field-1> |
| <plan> |
| payments | The number of payments before the recurring plan is complete.<br>Notes: '0' for until canceled |
| amount | The plan amount to be charged each billing cycle.<br>Format: x.xx |
| name | The display name of the plan. |
| plan-id | The plan ID that is associated with this subscription. |
| day-frequency | How often, in days, to charge the customer. Cannot be set with 'month-frequency' or 'day-of-month'. |
| month-frequency | How often, in months, to charge the customer. Cannot be set with 'day-frequency'. Must be set with 'day-of-month'.<br>Values: 1 through 24 |
| day-of-month | The day that the customer will be charged. Cannot be set with 'day-frequency'. Must be set with 'month-frequency'.<br>Values: 1 through 31 - for months without 29, 30, or 31 days, the charge will be on the last day |
| </plan> |
| <billing> | The customer's billing information. |
| billing-id | Billing id used or created for this action. |
| first-name | Cardholder's first name. |
| last-name | Cardholder's last name. |
| address1 | Cardholder's billing address. |
| city | Card billing city. |
| state | Card billing state/province.<br>Format: CC |
| postal | Card billing postal code. |
| country | Card billing country code.<br>Format: CC/ISO 3166 |
| phone | Billing phone number. |
| email | Billing email address. |
| company | Cardholder's company. |
| address2 | Card billing address, line 2. |
| fax | Billing fax number. |
| social-security-number | Customer's social security number |
| drivers-license-number | Drivers license number. |
| drivers-license-dob | Drivers license date of birth. |
| drivers-license-state | Customer's drivers license state.<br>Format: CC |
| cc-number | Masked credit card number.<br>Format: XXXXXX\*\*\*\*\*\*\*\*XXXX |
| cc-exp | Credit card expiration.<br>Format: MMYY |
| account-name | The name on the customer's bank account. |
| account-number | Masked bank account number.<br>Format: X\*\*\*\*XXXX |
| routing-number | Masked bank routing number.<br>Format: X\*\*\*\*XXXX |
| account-type | The customer's ACH account type.<br>Values: 'checking' or 'savings' |
| entity-type | The customer's ACH account entity.<br>Values: 'personal' or 'business' |
| priority | Billing id priority.<br>Format: Numeric, 1-255 |
| </billing> |
| <shipping> | The customer's shipping information. |
| shipping-id | Shipping id used or created during action. |
| first-name | Shipping first name. |
| last-name | Shipping last name. |
| address1 | Shipping address. |
| city | Shipping city. |
| state | Shipping state/province.<br>Format: CC |
| postal | Shipping postal code. |
| country | Shipping country code.<br>Format: CC/ISO 3166 |
| phone | Shipping phone number. |
| email | Shipping email address. |
| company | Shipping company. |
| address2 | Shipping address, line 2. |
| fax | Shipping fax number. |
| priority | Shipping id priority.<br>Format: Numeric, 1-255 |
| </shipping> |
| </response> |

# Additional Operations  Three-Step: Recurring

## Add Plan XML Request

| Element | Description |
| --- | --- |
| <add-plan> | Add a recurring plan that subscriptions can be added to in the future. |
| api-key\* | api-key is obtained in the Security Keys section of the Control Panel Settings. |
| <plan> |
| payments\* | The number of payments before the recurring plan is complete.<br>Notes: '0' for until canceled |
| amount\* | The plan amount to be charged each billing cycle.<br>Format: x.xx |
| name\* | The display name of the plan. |
| plan-id\* | The unique plan ID that references only this recurring plan. |
| day-frequency\*\* | How often, in days, to charge the customer. Cannot be set with 'month-frequency' or 'day-of-month'. |
| month-frequency\\*\\*\\* | How often, in months, to charge the customer. Cannot be set with 'day-frequency'. Must be set with 'day-of-month'.<br>Values: 1 through 24 |
| day-of-month\\*\\*\\* | The day that the customer will be charged. Cannot be set with 'day-frequency'. Must be set with 'month-frequency'.<br>Values: 1 through 31 - for months without 29, 30, or 31 days, the charge will be on the last day |
| </plan> |
| </add-plan> |

|     |     |
| --- | --- |
| \* | Always required |
| \*\* | Required unless 'month-frequency' and 'day-of-month' is set. |
| \\*\\*\\* | Required unless 'day-frequency' is set. |

## Delete a Subscription

| Element | Description |
| --- | --- |
| <delete-subscription> | Delete the subscription. Customer will no longer be charged. |
| api-key\* | api-key is obtained in the Security Keys section of the Control Panel Settings. |
| subscription-id\* | The subscription ID that will be deleted. |
| </delete-subscription> |

|     |     |
| --- | --- |
| \* | Always required |

# Testing Information  Three-Step

## Transaction Testing Credentials

Transactions can be tested using one of two methods. First, transactions can be submitted to any merchant account that is in test mode. Keep in mind that if an account is in test mode, all valid credit cards will be approved but no charges will actually be processed.

The Payment Gateway demo account can also be used for testing at any time. Please use the following api-key for testing with this account:

|     |     |
| --- | --- |
| api-key: | 2F822Rw39fx762MaV7Yy86jXGTC7sCDy |

## Transaction POST URL

In step one and step three, transaction details should be POST'ed using XML to the following URL:

|     |     |
| --- | --- |
| POST URL | https://secure.easypaydirectgateway.com/api/v2/three-step |

## Test Data

Transactions can be submitted using the following information:

|     |     |
| --- | --- |
| Visa: | 4111111111111111 |
| MasterCard: | 5431111111111111 |
| Discover: | 6011000991300009 |
| American Express: | 341111111111111 |
| Diner's Club: | 30205252489926 |
| JCB: | 3541963594572595 |
| Maestro: | 6799990100000000019 |
| Credit Card Expiration: | 10/25 |
| account (ACH): | 24413815 |
| routing (ACH): | 490000018 |
| amount | 1.00 (Amounts under 1.00 generate failure). |

## Triggering Errors in Test Mode

- To cause a declined message, pass an amount less than 1.00.
- To trigger a fatal error message, pass an invalid card number.
- To simulate an AVS match, pass 888 in the address1 field, 77777 for zip.
- To simulate a CVV match, pass 999 in the cvv field.

# AVS Response Codes  Three-Step

## AVS Response Codes

|     |     |
| --- | --- |
| X | Exact match, 9-character numeric ZIP |
| Y | Exact match, 5-character numeric ZIP |
| D | Exact match, 5-character numeric ZIP |
| M | Exact match, 5-character numeric ZIP |
| 2 | Exact match, 5-character numeric ZIP, customer name |
| 6 | Exact match, 5-character numeric ZIP, customer name |
| A | Address match only |
| B | Address match only |
| 3 | Address, customer name match only |
| 7 | Address, customer name match only |
| W | 9-character numeric ZIP match only |
| Z | 5-character ZIP match only |
| P | 5-character ZIP match only |
| L | 5-character ZIP match only |
| 1 | 5-character ZIP, customer name match only |
| 5 | 5-character ZIP, customer name match only |
| N | No address or ZIP match only |
| C | No address or ZIP match only |
| 4 | No address or ZIP or customer name match only |
| 8 | No address or ZIP or customer name match only |
| U | Address unavailable |
| G | Non-U.S. issuer does not participate |
| I | Non-U.S. issuer does not participate |
| R | Issuer system unavailable |
| E | Not a mail/phone order |
| S | Service not supported |
| 0 | AVS not available |
| O | AVS not available |
| B | AVS not available |

# CVV Response Codes  Three-Step

## CVV Response Codes

|     |     |
| --- | --- |
| M | CVV2/CVC2 match |
| N | CVV2/CVC2 no match |
| P | Not processed |
| S | Merchant has indicated that CVV2/CVC2 is not present on card |
| U | Issuer is not certified and/or has not provided Visa encryption keys |

# Result Code Table  Three-Step

## Result Code Table

|     |     |
| --- | --- |
| 100 | Transaction was approved. |
| 200 | Transaction was declined by processor. |
| 201 | Do not honor. |
| 202 | Insufficient funds. |
| 203 | Over limit. |
| 204 | Transaction not allowed. |
| 220 | Incorrect payment information. |
| 221 | No such card issuer. |
| 222 | No card number on file with issuer. |
| 223 | Expired card. |
| 224 | Invalid expiration date. |
| 225 | Invalid card security code. |
| 226 | Invalid PIN. |
| 240 | Call issuer for further information. |
| 250 | Pick up card. |
| 251 | Lost card. |
| 252 | Stolen card. |
| 253 | Fraudulent card. |
| 260 | Declined with further instructions available. (See response text) |
| 261 | Declined-Stop all recurring payments. |
| 262 | Declined-Stop this recurring program. |
| 263 | Declined-Update cardholder data available. |
| 264 | Declined-Retry in a few days. |
| 300 | Transaction was rejected by gateway. |
| 400 | Transaction error returned by processor. |
| 410 | Invalid merchant configuration. |
| 411 | Merchant account is inactive. |
| 420 | Communication error. |
| 421 | Communication error with issuer. |
| 430 | Duplicate transaction at processor. |
| 440 | Processor format error. |
| 441 | Invalid transaction information. |
| 460 | Processor feature not available. |
| 461 | Unsupported card type. |

# Methodology  Query

## Overview

While our online reporting interface allows merchants to quickly and easily retrieve detailed information about past transactions, a need for additional flexibility may be required. For example, a merchant may have custom accounting software that requires up-to-date information about the settlement status of all credit card transactions every day.

This document describes how developers can query our reporting engine directly to retrieve transaction reports in a machine readable format. Once the data has been retrieved, it can then be parsed and imported into a variety of software applications.

## Communication

The communication protocol used to send messages to the Payment Gateway is through the HTTP protocol over an SSL connection (HTTPS). The format you must use is name/value pairs delimited by ampersand.

|     |     |
| --- | --- |
| URL: | https://secure.easypaydirectgateway.com/api/query.php |
| Example Post Data: | security\_key=security\_key&transaction\_id=123456789 |

You should POST your request to the Query API. The name/value pairs that are accepted by the Payment Gateway can be found in the 'Variables' section of this API.

The Query API can be tested with live credentials or a dedicated test account only. Please contact your Merchant Service Provider for more information.

The Query API will respond in Universal Time Coordinated (UTC).

# Variables  Query

## POST URL

|     |     |
| --- | --- |
| POST URL: | https://secure.easypaydirectgateway.com/api/query.php |

| Variable Name | Description(Allowed Values)\[Format\] |
| --- | --- |
| security\_key\* | API Security Key assigned to a merchant account.<br> New keys can be generated from the merchant control panel in Settings > Security Keys |
| condition | A combination of values listed below can be passed and should be separated by commas. For example, to retrieve all transactions pending settlement or complete, the following could be used: <br>Example: condition=pendingsettlement,complete |
| pending: 'Auth Only' transactions that are awaiting capture. |
| pendingsettlement: This transaction is awaiting settlement. |
| in\_progress: This Three-Step Redirect API transaction has not yet been completed. The transaction condition will change to 'abandoned' if 24 hours pass with no further action. |
| abandoned: This Three-Step Redirect API transaction has not been completed, and has timed out. |
| failed: This transaction has failed. |
| canceled: This transaction has been voided. |
| complete: This transaction has settled. |
| unknown: An unknown error was encountered while processing this transaction. |
| transaction\_type | Retrieves only transactions with the specified transaction type. Use one of the following to specify payment type: |
| cc: A credit card transaction. |
| ck: A check transaction. |
| action\_type | Retrieves only transactions with the specified action types. A combination of the values can be used and should be separated by commas. For example, to retrieve all transactions with credit or refund actions, use the following: <br>Example: action\_type=refund,credit |
| sale: Sale transactions. |
| refund: Refund transactions. |
| credit: Credit transactions. |
| auth: 'Auth Only' transactions. |
| capture: Captured transactions. |
| void: Voided transactions. |
| return: Electronic Check (ACH) transactions that have returned, as well as credit card chargebacks. |
| source | Retrieves only transactions with a particular 'transaction source'. A combination of the values can be <br> used and should be separated by commas. For example, to retrieve all transactions with api or <br> recurring actions, use the following: <br>Example: source=api,recurring |
| api: API transactions. |
| batch\_upload: Batch Upload transactions. |
| mobile: Mobile (iProcess) transactions. |
| quickclick: QuickClick transactions. |
| quickbooks: QuickBooks SyncPay transactions. |
| recurring: Recurring transactions when using Recurring module. |
| swipe: Swipe transactions. |
| virtual\_terminal: Virtual Terminal transactions. |
| internal: Internal transactions. Typically indicates settlement |
| transaction\_id | Specify a transaction ID or a comma separated list of transaction IDs to retrieve information on. Alternatively, provide a Subscription ID to retrieve processed (approved and declined) transactions associated with it. |
| subscription\_id | Set a specific subscription record or comma separated list of records. Using this with a transaction search will return all transactions associated with this subscription. This will return this subscription's payment/plan information when used with report\_type=recurring. |
| invoice\_id | Set a specific Invoice ID. Should only be used when report\_type=invoicing. |
| partial\_payment\_id | Retrieves only transactions with the specified partial payment ID. |
| order\_id | Retrieves only transactions with the specified Order ID. |
| first\_name | Retrieves only transactions with the specified first name. |
| last\_name | Retrieves only transactions with the specified last name. |
| address1 | Retrieves only transactions with the specified specified address. |
| city | Retrieves only transactions with the specified city. |
| state | Retrieves only transactions with the specified state. |
| zip | Retrieves only transactions with the specified zip/postal code. |
| phone | Retrieves only transactions with the specified phone number. |
| fax | Retrieves only transactions with the specified fax number. |
| order\_description | Retrieves only transactions with the specified order description. |
| drivers\_license\_number | Retrieves only transactions with the specified driver's license number. |
| drivers\_license\_dob | Retrieves only transactions with the specified driver's license date of birth. |
| drivers\_license\_state | Retrieves only transactions with the specified driver's license state. |
| email | Retrieves only transactions with the specified billing email address. |
| authorization\_code | Retrieves only transactions with the specified authorization code. |
| cc\_number | Retrieves only transactions with the specified credit card number. You can use either the full number or the last 4 digits of the credit card number. |
| merchant\_defined\_field\_# | Retrieves only transactions with the specified merchant defined field value.<br>Replace the '#' with a field number (1-20) (Example: merchant\_defined\_field\_12=value) |
| start\_date | Only transactions that have been modified on or after this date will be retrieved. Note that any actions performed on a transaction will cause the modified date to be updated. <br>Format: YYYYMMDDhhmmss |
| end\_date | Only transactions that have been modified on or before this date will be retrieved. Note that any actions performed on a transaction will cause the modified date to be updated. <br>Format: YYYYMMDDhhmmss |
| report\_type | Allows Customer Vault information or a html receipt to be returned. If you would like to query the Customer Vault to view what customer information is stored in the Customer Vault, you must set the customer\_vault variable.<br> If you omit the customer\_vault\_id, the system will return all customers that are stored in the vault. If you include a customer\_vault\_id, it will return the customer record associated with that ID.<br> Example: report\_type=customer\_vault&customer\_vault<br> \_id=123456789 |
| receipt: Will return an html receipt for a specified transaction id. |
| customer\_vault: Set the Query API to return Customer Vault data. |
| recurring: Set the Query API to return subscription data. |
| recurring\_plans: Set the Query API to return plan data. |
| invoicing: Set the Query API to return invoicing data. |
| gateway\_processors: Will return Processor details a user has permissions for. Specify a "user" by querying with that security key. |
| account\_updater: Will return Customer Vault data that has been updated using the Account Updater service. |
| test\_mode\_status: Will return whether the account has test mode active or inactive. |
| profile: Return merchant profile (company, email, address, timezone, defined fields, gateway, favicon, status). It will also return card\_schemes with 'processor\_details' set to 'true' |
| mobile\_device\_license | Retrieves only transactions processed using the specified mobile device.<br> The device IDs for this parameter are available in the License Manager.<br> Use 'any\_mobile' to retrieve all mobile transactions.<br> A combination of the values can be used and should be separated by commas.<br> Can not be used with 'mobile\_device\_nickname'. <br>Example 1: mobile\_device\_license=D91AC56A-4242-3131-2323-2AE4AA6DB6EB <br>Example 2: mobile\_device\_license=any\_mobile |
| mobile\_device\_nickname | Retrieves only transactions processed using mobile devices with the specified nickname.<br> The nicknames for this parameter are available in the License Manager.<br> Can not be used with 'mobile\_device\_license'. <br>Example (URL encoded): mobile\_device\_nickname=Jim's%20iPhone |
| customer\_vault\_id | Set a specific Customer Vault record. Should only be used when report\_type=customer\_vault. |
| date\_search | Allows Customer Vault information to be returned based on the 'created' or 'updated' date. If you would like to query the Customer Vault to view when customer information was created or updated, you must set the report\_type variable with the customer\_vault value. <br> If you omit the report\_type variable, the system will ignore the date\_search variable. <br> Example: <br>report\_type=customer\_vault&date\_search=created,updated&start\_date=20170101000000&end\_date=20201231232359 |
| created: Will return Customer Vault data created during a specified date range. |
| updated: Will return Customer Vault data updated during a specified date range. |
| result\_limit | Determines the maximum number of results that may return for the current query. |
| page\_number | Determines which "page" of results are returned. For example, "result\_limit=100&page\_number=0" will return the first 100 results. Using "page\_number=1" will return the next 100 results. Default is "0". |
| result\_order | Determines order of in which results are returned. Default value is "standard". |
| standard: Returns the results from oldest to newest. |
| reverse: Returns the results from newest to oldest. |
| invoice\_status |
| Specify a comma separated list of what invoice statuses will return when using an "invoicing" report type. <br> Example: invoice\_status=open,closed,paid |
| open: Open Invoices |
| paid: Paid Invoices |
| closed: Closed Invoices |
| past\_due: Past Due Invoices |
| processor\_details | Can be use with "report\_type"="profile", this will include merchant "card\_schemes" in the response |

# Sample Response  Query with no report\_type or report\_type "transaction"

```xml

<nm_response>
    <transaction>
        <transaction_id>2612675976</transaction_id>
        <partial_payment_id></partial_payment_id>
        <partial_payment_balance></partial_payment_balance>
        <platform_id></platform_id>
        <transaction_type>cc</transaction_type>
        <condition>complete</condition>
        <order_id>1234567890</order_id>
        <authorization_code>123456</authorization_code>
        <ponumber></ponumber>
        <order_description></order_description>
        <first_name>John</first_name>
        <last_name>Smith</last_name>
        <address_1>123 Main St</address_1>
        <address_2>Apt B</address_2>
        <company></company>
        <city>New York City</city>
        <state>NY</state>
        <postal_code>10001</postal_code>
        <country>US</country>
        <email>johnsmith@example.com</email>
        <phone>1234567890</phone>
        <fax></fax>
        <cell_phone></cell_phone>
        <customertaxid></customertaxid>
        <customerid></customerid>
        <website></website>
        <shipping_first_name></shipping_first_name>
        <shipping_last_name></shipping_last_name>
        <shipping_address_1></shipping_address_1>
        <shipping_address_2></shipping_address_2>
        <shipping_company></shipping_company>
        <shipping_city></shipping_city>
        <shipping_state></shipping_state>
        <shipping_postal_code></shipping_postal_code>
        <shipping_country></shipping_country>
        <shipping_email></shipping_email>
        <shipping_carrier></shipping_carrier>
        <tracking_number></tracking_number>
        <shipping_date></shipping_date>
        <shipping>1.00</shipping>
        <shipping_phone></shipping_phone>
        <cc_number>4xxxxxxxxxxx1111</cc_number>
        <cc_hash>f6c609e195d9d4c185dcc8ca662f0180</cc_hash>
        <cc_exp>1215</cc_exp>
        <cavv></cavv>
        <cavv_result></cavv_result>
        <xid></xid>
        <eci></eci>
        <directory_server_id></directory_server_id>
        <three_ds_version></three_ds_version>
        <avs_response>N</avs_response>
        <csc_response>M</csc_response>
        <cardholder_auth></cardholder_auth>
        <cc_start_date></cc_start_date>
        <cc_issue_number></cc_issue_number>
        <check_account></check_account>
        <check_hash></check_hash>
        <check_aba></check_aba>
        <check_name></check_name>
        <account_holder_type></account_holder_type>
        <account_type></account_type>
        <sec_code></sec_code>
        <drivers_license_number></drivers_license_number>
        <drivers_license_state></drivers_license_state>
        <drivers_license_dob></drivers_license_dob>
        <social_security_number></social_security_number>
        <processor_id>processora</processor_id>
        <tax>1.00</tax>
        <currency>USD</currency>
        <surcharge></surcharge>
        <convenience_fee></convenience_fee>
        <misc_fee_name></misc_fee_name>
        <misc_fee></misc_fee>
        <cash_discount></cash_discount>
        <tip></tip>
        <card_balance></card_balance>
        <card_available_balance></card_available_balance>
        <entry_mode>Keyed</entry_mode>
        <cc_bin>411111</cc_bin>
        <cc_type>visa</cc_type>
        <signature_image>
            iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAAXNSR0IArs4c6QAAAARnQU1BAA
                Cxjwv8YQUAAAAJcEhZcwAAEnQA
            ABJ0Ad5mH3gAAACGSURBVDhPlZGBEoAgCEO1//9nG83mxMrr3dkBG0hVW2vFqLX26CYbPIc7yS
                AVe8LBq5u4elyV4M0NXIoGXYqA
            w4QqMAwJCRu+Az7HSlvgHtexlFKwGrLjG/h/rESmhrhRnLCKwjiNeLYv5QsXOoNSig8IsNYaZ0
                tXJoGU9hU1k18XlZLOQHTenf7I
            cf3BwAAAABJRU5ErkJggg==
        </signature_image>
        <product>
            <sku>RS-100</sku>
            <quantity>1.0000</quantity>
            <description>Red Shirt</description>
            <amount>10.0000</amount>
        </product>
        <action>
            <amount>11.00</amount>
            <action_type>sale</action_type>
            <date>20150312215205</date>
            <success>1</success>
            <ip_address>1.1.1.1</ip_address>
            <source>virtual_terminal</source>
            <api_method></api_method>
            <username>demo</username>
            <response_text>SUCCESS</response_text>
            <batch_id>0</batch_id>
            <processor_batch_id></processor_batch_id>
            <response_code>100</response_code>
            <processor_response_text>NO MATCH</processor_response_text>
            <processor_response_code>00</processor_response_code>
            <requested_amount>11.00</requested_amount>
            <device_license_number></device_license_number>
            <device_nickname></device_nickname>
        </action>
        <action>
            <amount>11.00</amount>
            <action_type>level3</action_type>
            <date>20150312215205</date>
            <success>1</success>
            <ip_address>1.1.1.1</ip_address>
            <source>virtual_terminal</source>
            <api_method></api_method>
            <username>demo</username>
            <response_text></response_text>
            <batch_id>0</batch_id>
            <processor_batch_id></processor_batch_id>
            <response_code>100</response_code>
            <processor_response_text></processor_response_text>
            <processor_response_code></processor_response_code>
            <device_license_number></device_license_number>
            <device_nickname></device_nickname>
        </action>
        <action>
            <amount>11.00</amount>
            <action_type>settle</action_type>
            <date>20150313171503</date>
            <success>1</success>
            <ip_address></ip_address>
            <source>internal</source>
            <api_method></api_method>
            <username></username>
            <response_text>ACCEPTED</response_text>
            <batch_id>76158269</batch_id>
            <processor_batch_id>782</processor_batch_id>
            <response_code>100</response_code>
            <processor_response_text></processor_response_text>
            <processor_response_code>0000000000021980</processor_response_code>
            <device_license_number></device_license_number>
            <device_nickname></device_nickname>
        </action>
    </transaction>
</nm_response>


```

# Query with report\_type "profile" and processor\_details "true"

```xml

<nm_response>
    <protected>false</protected>
    <is_gateway>false</is_gateway>
    <merchant>
        <company>Test Company</company>
        <email>johnsmith@example.com</email>
        <phone>123-456-7890</phone>
        <url></url>
        <address1>123 Fake St</address1>
        <address2></address2>
        <city>Beverly Hills</city>
        <state>CA</state>
        <zip>90210</zip>
        <country>US</country>
        <timezone>America/New_York (GMT-05:00) Eastern Time (US & Canada)</timezone>
        <card_schemes>Visa,Mastercard,American Express,Discover,Diner's Club,JCB,Maestro,Banco Popular,Isracard,Hipercard,Credomatic Card,EBT</card_schemes>
    </merchant>
    <gateway>
        <company>Test Reseller</company>
        <url></url>
        <email>johnsmith@example.com</email>
        <phone>123-456-7890</phone>
        <primary_color>36175F</primary_color>
        <complimentary_color_1>F1577B</complimentary_color_1>
        <complimentary_color_2>26CC9D</complimentary_color_2>
    </gateway>
    <merchant_defined_fields></merchant_defined_fields>
    <merchant_favicon>iVBORw0KGgoAAAANSUhEUgAAALQAAAC0CAMAAAAKE/YAAAAABGdBTUEAALGPC/xhBQAAAAFzUkdCAK7OHOkAAACfUExURUdwTPX19fX19fb29vn5+fX19fX19fb29vX19fX19fb29vb29v////b29vX19f////n5+fX19fn5+fX19ff39/X19fb29vX19fb29vX19f////X19fX19fb29vX19fb29vX19fX19fb29mRkZBcXF/X19e7u7hsbGx8fH0dHR8rKytjY2IWFhb6+vqysrDk5OTg4OFBQUCgoKCEhISIiIjOJ5RMAAAAjdFJOUwD83x8tUeeStfk9rAbl7w8wzDHsINJ82Y42CcFnf/0/9v4+JiMvSAAAAqRJREFUeNrt3dlSwkAUBNBhkSTsyCqr4lyRffP/v81dS0wmQCnc1u5Hn85DhAxV022MK+1ht+XXk9VATpSgmqz7re6wbY7MVa9zMuw3fKd3dbi41mjKmdNs1A4iX+b6oiD93OXe5LIvauKX9yKXvIQoSsIrxZsvMqIsmYsYct4ThfHyLnOqIipTSUWb0wVRmkI6ypwtitoUsxHma1Gc61B1uiiqUwx5QlIFUZ7Ct//GfEXUp7L7yecJQLyd70GByJfvxlIGA50poT0cOw9IOYGCTny+qfoCE//jnCJAeT/L5JDQubcz7A0Suv962m0IVBov6CYWuvnym4yA5flXnB4auveE7qChO8a0AzR00DYDgcvAdPHQXdPCQ7eQXpY+X5rqeOi6SeKhk6aKh66aiI/pyWy92tpzZrtazybhH9Qm9M+LpdWR5SKMF4aejq2ejKd7oecbqymb+R7o+cjqymgei55urLZspnHosdWXcQx6YTVm4UYvVaKXTvTE6szEhZ4pRc9c6LVS9NqFXilFr1zorVL01oW2WkM00Uei77XGhb7VGqKJJppoookmmmiiiSaaaKKJJloTeqQ1/FmMaKKJJppoookm+qfQd78aookmmmiiiSaaaKKJ/ttonlyIJhrgYEs00UQTTTTR/wPNdw+iMS6cPfy5q32Qlyghr6tCXgyGvIKNedkdslYAs8ABsioDs5QEs/4Fs2hHe6VRJFp1TIBnDjBruiAL0SCr5yBL/iDrFCGLKwErQoeYZayQtbeYBcOQVc6QpdmY9eSQRfCQlfuY4waQMxKYgx2Q0yiYIzSQcz+Yw0qYE1aQY2GYs2yYA3iYU4OYo46Y85mYQ6WYk7Cg47uYM8evg9Iqzo2HDEqDTneDjqS/zdEPzjNHP3DP0T8C4oBc15g2YiAAAAAASUVORK5CYII=</merchant_favicon>
    <account_details>
        <account_status>active</account_status>
        <test_mode_enabled>false</test_mode_enabled>
    </account_details>
</nm_response>


```

# Methodology  QuickClick

## Button Types

- Shopping Cart Button:
Will connect products built with this button type so customers can add several products to the cart system. Also supports Recurring Billing.
- Fixed Price Button:
Does not connect to the 'Shopping Cart' system and will only process one item at a time.
- Donation/Payment Button:
Allows the customer to enter an amount and checkout.

## Adding Buttons to Your Site

#### HTML

QuickClick buttons can be added to your website using an HTML form. This form can be created using our Button Generator or using the values found in the 'Variables' section. The form should use the "POST" method and the action should be https://secure.easypaydirectgateway.com/cart/cart.php.

#### Link Alternative

Some websites do not allow for entry of HTML, and can sometimes act finicky. If this is the case with your website, you have the option of using the Link Alternative which can be pasted on your website as a link. The only way to create this link is by using the Button Generator.

Please note that use of this link will nullify any shopping cart product options or text input (amount) fields as these options appear alongside the HTML button.

#### IFrame Support

Please note that QuickClick is NOT supported via iframes as there are documented browser bugs (notably in Safari) that do not allow the user to view QuickClick due to Safari's documented blocking of third party cookies.

# Customization  QuickClick

You will need to have the Administrative Options permission set in order to access QuickClick settings. These can be found by clicking on the QuickClick link under Settings(the link, not in Integration).

## Look and Feel

#### Choose a Profile

In order to choose a pre-existing profile, select 'Make Default' to the right of the profile name. If there is no 'Make Default' link, the profile is already set.

#### Add New Profile

1. Name the profile (no spaces).
2. Choose the colors of the Text, Form fields, Form Headers, Required Fields/Errors, and Background. If you do not see the HEX value desired, you can input any web friendly HEX value into the fields provided.
3. Enter in one of the following: a Direct Link to an image file (ex: http://www.mywebsite.com/images/logo.png) or a direct link to an HTML/PHP file that contains a header with the same look of the Merchant Website. (ex: http://www.mywebsite.com/header.html)
4. Within Header Text, you can paste a style sheet HTML string like so: <link rel="stylesheet" href="http://www.mywebsite.com/css/style.css" /> and QuickClick will use that style sheet to make the form look like forms on the Merchant website.
5. You may use a Footer file as well to round out the page, but do NOT enter the same style sheet link into the footer text field.
6. Click Save. This will bring you back to the Look and Feel page, and you will see your new profile in the list. To make it active, click 'Make Default'.

## Customer Information

While field names can not be altered, fields that are not required can be hidden if not needed. Here, you will see a list of all available QuickClick fields.

- It is recommended to choose 'Required' for the Card Security Code.
- You may choose Hidden' for any other fields not wanted/needed.
- If you have created any Merchant Defined Fields and want them visible on the Form, please make them 'Optional' or 'Required' at the bottom of the list as they are Hidden by default.
- Click 'Save' at the bottom of the page when you are done.

## Payment Methods

This is where you can decide which payment methods (Credit Card, Electronic Check) will be accepted by QuickClick.

## Security

QuickClick 'Verification' involves a hashing so that malicious users are unable to alter the button HTML. This can be turned on and off using this interface. If you do not wish to use Verification you must uncheck 'Require that all values be verified using a security key'. This will associate your Buttons with your GATEWAY USERNAME.

Please advise that buttons can become void if a username is ever deleted from the Gateway. Using Verification eliminates this possibility.

QuickClick also has the option of requiring your customers to enter a CAPTCHA entry in order to process. This makes it more difficult for fraudsters to use your button for fraud using a bot or brute force tool. This can be disabled and enabled using this interface.

## Tax

In order to set tax, choose the State from the drop-down, and enter the percentage Tax Rate in the field to the right. When you click 'Save', QuickClick will automatically calculate Tax based on the State entered into the Billing Address form when checking out. Tax will NOT appear until this occurs. This setting is specific to the Shopping Cart Button and does not apply to Fixed Price or Donation Buttons.

## Shipping

Rather than charging shipping on a 'per item basis' most merchants prefer to use the Shipping threshold module. The threshold is based off of dollar amount. For example, the very first threshold should be below the lowest priced item -- it's suggested to use .01 as the first threshold, and then set both the domestic and international rate. It is not possible to exclude the International field from this threshold.

For example: if you want to offer free shipping on purchases over $100.00, enter shipping threshold as such:

| Threshold | Domestic | International |
| --- | --- | --- |
| 100.00 | 0.00 | 0.00 |

You can also choose specific shipping types and mark them up by percentages (including 0% if necessary). For example, if 'Ground' is checked, and a 15% markup entered, QuickClick will use the Threshold table and add 15% to the total Shipping dependent on the total amount in the cart. As an example:

Shipping Threshold is 50.00 @ 15.00 Domestic. If I, as the customer, buy 53.00 of product and choose Ground Shipping, my total shipping cost will now be $17.25.

## Convenience Fee/Surcharging Configuration

The Gateway supports a Convenience Fee/Surcharge feature which can be used with QuickClick. To change these settings, please navigate to 'Settings'->'Convenience Fee/Surcharging Configuration' and activate the option, set the fixed and percentages and the Default Type and click 'Save'.

Once those are saved, the Default Surcharge Type for QuickClick can be set.

# Button Generator Fields  QuickClick

## Shopping Cart Button

#### Product Information

- Item Description: This is the description a customer will see in their Cart. A detailed, but not lengthy, description of the item should be typed here.
- Item ID (SKU): This is the SKU or Unique ID for that product. This can also be a SKU associated with a Recurring Plan. If this isn't a recurring charge, do not enter a Plan SKU in this field.
- Item Price: Enter the price of the item in this field without including any currency symbols. (ex: 10.00)
- Shopping Cart Language: There is the option of having the cart display in English or Spanish. Choose accordingly.
- 'Quantity' checkbox: This option is a little unclear. If you check this box, a field will display on the Merchant's website. If you do not, the customer will be able to change the quantity when on the cart page.

#### URLs

- Cancel URL:
Enter a Fully Qualified URL to direct customers to should they wish to empty their cart and exit the system. (ex: http://www.mywebsite.com/cancel-purchase).
- Continue URL:
Enter a Fully Qualified URL to direct customers back to the merchant's website to add more product. Typically merchants prefer this link to be that of their shop page. (ex: http://www.mywebsite.com/shop)
- Finish URL:
Enter a Fully Qualified URL to send customers to after they've successfully checked out. Typically merchants prefer a thank you page. (ex: http://www.mywebsite.com/thank-you) or something similar.

#### Shipping Amount

- If you want to charge shipping on a PER ITEM basis, use this field. If not, leave it blank. This field will not accept a 0.00 entry.

#### Product Options

You are not required to use these, but they are helpful if the product has variations or special features. These fields appear alongside the button itself, and NOT within the actual cart system.

An example of the use of these fields would be sizes (Small, Medium, Large, etc.) and/or colors (Blue, Red, Yellow, etc.). Some developers even use these to customize monogrammed items. Here is an example of both:

- Size Variation
  - Option Name: Size
  - Field Type: Dropdown Menu
  - Option Choices: (Enter each option and hit 'enter' after, so they are stacked.)
    - Small
    - Medium
    - Large
- Text Entry Option
  - Option Name: Custom Monogram
  - Field Type: Text Entry
  - Option Choices: \*Leave Blank\*

#### Key Verification

It is strongly recommended that you always select a key and not 'No Verification'. This protects the button HTML and prohibits malicious users from altering the code.

## Fixed Price Button

#### Product Information

- Item Description: This is the description a customer will see in their Cart. A detailed, but not lengthy, description of the item should be typed here.
- Item Price: Enter the price of the item in this field without including any currency symbols. (ex: 10.00)
- Shopping Cart Language: There is the option of having the cart display in English or Spanish. Choose accordingly.

#### URLs

- Finish URL:
Enter a Fully Qualified URL to send customers to after they've successfully checked out. Typically merchants prefer a thank you page. (ex: http://www.mywebsite.com/thank-you) or something similar.

#### Key Verification

It is strongly recommended that you always select a key and not 'No Verification'. This protects the button HTML and prohibits malicious users from altering the code.

Note: This button does not support shipping and/or tax options.

## Donation Button

#### Product Information

- Item Description: This is the description a customer will see in their Cart. A detailed, but not lengthy, description of the item should be typed here.
- Shopping Cart Language: There is the option of having the cart display in English or Spanish. Choose accordingly.

#### URLs

- Finish URL:
Enter a Fully Qualified URL to send customers to after they've successfully checked out. Typically merchants prefer a thank you page. (ex: http://www.mywebsite.com/thank-you) or something similar.

#### Key Verification

It is strongly recommended that you always select a key and not 'No Verification'. This protects the button HTML and prohibits malicious users from altering the code.

Note: This button can also be used for Bill Pay. Once the button has been generated, you can change the button text from 'Donate' to 'Pay Now' or your desired text by altering this line of code:

```html
<input type="submit" name="submit" value="Donate" />
```

# Variables  QuickClick

## All Buttons

| Name | Value: Description |
| --- | --- |
| action | show\_cart: Displays the customer's shopping cart. |
| process\_cart: Adds one or more products to the customer's cart. |
| process\_variable: This processes a variable amount transaction. During the checkout process, the cardholder is given the ability to specify the amount. This is useful for donations. |
| process\_fixed: This processes a fixed amount, single item transaction. This is basically a "Buy Now" type transaction. The customer is not able to specify an amount during checkout. |
| username | Specifies a merchant username. Either this or a key\_id is required. Using a key\_id method is the preferred. |
| key\_id | Specifies a development key id. Either this or username is required, this method is preferred. |
| hash | The hash field is used to pass a verification hash. By using a verification hash, you can ensure that no one will be able to pass an unauthorized price, SKU, shipping price, or tax information. |
| product\_taxable\_# | Controls whether the product will be affected by the tax rates configured in your QuickClick tax options. Set this to '0' or 'false' to ensure that a customer doesn't get charged taxes on a product/service. The default is true.' |
| order\_description | Specifies a description for the product. |
| currency | Applies to USD and CAD currencies only. The currency is included with the hash, so it will need to be hashed outside of the button generator, or hashing will need to be turned off. |
| language | Specifies the language to be used for the cart and checkout webpages. Current valid values are 'en' for English and 'es' for Spanish. |
| url\_finish | Specifies a page that the customer should be sent to after finishing their order. This page will receive several pieces of information concerning the completed order. If you have some programming knowledge, you can have your page process and store this information. The information can be useful for order fulfillment, amongst other things. Please ensure URLs are fully qualified (example: http://www.example.com). |
| return\_link | Used in place of url\_finish in order to skip the QuickClick receipt page. Value should be the url to your own receipt/thank you page. |
| return\_method | Used to skip the QuickClick receipt page. Value should equal "redirect" |
| profile | Specify the profile the button should use. |
| customer\_receipt | Specifies whether to email the customer a receipt after their transaction is complete. If multiple customer email receipts exist, the name of the desired receipt can be passed as the value, otherwise 'true' should be passed. |
| merchant\_receipt\_email | Specifies a list of email addresses to send merchant receipts to. Our system will send merchant receipts to all of the specified recipients in addition to any users that are configured to receive transaction receipts in the Merchant Control Panel. If there are multiple recipients, separate them with a comma. You can also set this to 'false' if you do not want any merchant receipts to be sent. |
| merchant\_defined\_field\_# | A merchant defined field can be used to pass any type of information you'd like. For example, if you wish the user to specify their mother's maiden name, you could use a merchant defined field. This information shows up in reports and customer/merchant receipts. The # can be any number 1-20. Descriptions for the merchant defined fields can be set within the Merchant Control Panel's 'Gateway Options'. |
| shipping\_same | Indicates whether the shipping information is the same as the billing information. The default setting is 1 (true). Set this to 0 to always ask the customer for separate shipping information. If you plan on passing other shipping\_ parameters (i.e. shipping\_first\_name), ensure that you set this to 0. For additional options regarding the Shipping Address, examine the QuickClick Customer Information Options in your Merchant Control Panel. |
| first\_name | The customer's first name. |
| last\_name | The customer's last name. |
| address\_1 | The first part of the customer's street address. |
| address\_2 | The second part of the customer's street address. |
| city | The customer's city. |
| company | A company name. |
| postal\_code | The customer's postal (zip) code. |
| state | If they're in the US, this should be the customer's 2 letter state code. Otherwise, this can be used to pass a province or region. |
| country | The customer's 2 letter country code. |
| phone | The customer's phone number. |
| fax | The customer's fax number. |
| website | The customer's website address. |
| email | The customer's email address. |
| shipping\_first\_name | The receiver's first name. |
| shipping\_last\_name | The receiver's last name. |
| shipping\_address\_1 | The first part of the receiver's street address. |
| shipping\_address\_2 | The second part of the receiver's street address. |
| shipping\_city | The receiver's city. |
| shipping\_company | A receiving company name. |
| shipping\_postal\_code | The receiver's postal (zip) code. |
| shipping\_state | If they're in the US, this should be the receiver's 2 letter state code. Otherwise, this can be used to pass a province or region. |
| shipping\_country | The receiver's 2 letter country code. |
| shipping\_email | The receiver's email address. |

## Fixed/Donation Buttons Only

|     |     |
| --- | --- |
| amount | Specifies the amount, in US dollars. This is used only for fixed and variable price buttons. |

## Shopping Cart Buttons Only

| product\_description\_# | Specifies a description for the given product. |
| product\_sku\_# | Specifies a SKU for a given product to uniquely identify it. |
| product\_quantity\_# | Specifies the quantity for a given product number. If this parameter isn't passed, '1' is assumed. |
| product\_amount\_# | Specifies the amount, in US dollars, for the given product. |
| product\_option\_#\_# | Product options can allow your customers to make some additional choices before adding a product to their cart. For example, if you're selling a T-Shirt, you may want to allow the customer to define a size (Small, Medium, or Large) before adding the product to their cart. Up to 3 product options can be defined for a single product. The first number field is the product option number, and the last number field is the product number. For product #1, the product option field names would follow this form: <br>product\_option\_1\_1 (option #1, product #1)<br>product\_option\_2\_1 (option #2, product #1)<br>product\_option\_3\_1 (option #3, product #1)<br> <br>Ultimately, any option values passed in are appended to the product description. This can be very useful when fulfilling orders. If your T-Shirt was defined to have a color option and a size option, the resulting description might look like this: <br>T-Shirt (Red) (Large) The value can be anything you want, and you can utilize any form elements to pass it in (i.e. text, a dropdown, or radio buttons). Also note that our Button Creator is able to generate buttons with product options. |
| product\_option\_values\_#\_# | The product\_option\_values field can be used for two main purposes: <br>- Unless the product\_option\_values field is used, a customer would technically be able to pass any option values they want. For most merchants, this is not of great concern, but if this is a concern for you, the product\_option\_values field can be used to restrict which options can be passed in. Setting a product\_option\_values field to "Red\|Green", for example, would only allow Red or Green to be passed in as options for a particular product. In this case, passing anything else would generate an error. <br>- The product\_option\_values field can also be used to create an option that increases the price of an item. For example, a large T-Shirt may cost slightly more than a smaller T-Shirt. Setting a product\_option\_values field to "Small\|Medium:1.00\|Large:2.00" would ensure that medium shirts would be charged $1.00 more than the product's amount, large shirts would be charged $2.00 more than the product's amount, and that small shirts would not be charged extra at all. <br> The product\_option\_values field's naming convention is very similar to that of the product\_option field. <br> The first number field is the product option number, and the last number field is the product number. For product #1, the product option field names would follow this form: <br> product\_option\_values\_1\_1 (option #1, product #1)<br> product\_option\_values\_2\_1 (option #2, product #1)<br> product\_option\_values\_3\_1 (option #3, product #1) |
| product\_shipping\_# | Specifies a set of shipping overrides for a particular product. This field allows you override shipping prices on a per-product and per-country basis. The shipping parameter overrides any settings configured in the Merchant Control Panel QuickClick Options.

| Examples |
| --- |
| fixed\|10.00 | Charge $10.00 per item for shipping. |
| fixed\|10.00\|5.00 | Charge $10.00 for the first item, and $5.00 for each additional item. |
| fixed\|10.00\|5.00\|country:CA\|15.00\|10.00 | - When shipped within Canada, charge $15.00 for the first item, and $10.00 for each additional item.<br>- When shipped elsewhere, charge $10.00 for the first item, and $5.00 for each additional item. | |
| url\_continue | Specifies a page that the customer should be sent to when they wish to continue shopping. This only applies to shopping cart buttons. Please ensure URLs are fully qualified (example: http://www.example.com). |
| url\_cancel | Specifies a page that the customer should be sent to after they cancel their order. This only applies to shopping cart buttons. Please ensure URLs are fully qualified (example: http://www.example.com). |
| checkout | When set to true, the shopping cart page is skipped and the customer is sent immediately to the customer information screen or directly to checkout. This is useful if you need to pass SKUs, but still want a 'Buy Now' feel to the checkout process. |

# Testing Information  QuickClick

## Transaction testing credentials

Transactions can be tested using one of two methods. First, transactions can be submitted to any merchant account that is in test mode. Keep in mind that if an account is in test mode, all valid credit cards will be approved but no charges will actually be processed.

The Payment Gateway demo account can also be used for testing at any time. Please use the following key id or username for testing with this account:

|     |     |
| --- | --- |
| key\_id: | 3785894 |
| username: | demo |

## Transaction POST URL

Transaction details should be POST'ed to the following URL:

|     |     |
| --- | --- |
| POST URL: | https://secure.easypaydirectgateway.com/cart/cart.php |

## Test Data

Transactions can be submitted using the following information:

|     |     |
| --- | --- |
| Visa: | 4111111111111111 |
| MasterCard: | 5431111111111111 |
| Discover: | 6011000991300009 |
| American Express: | 341111111111111 |
| Diner's Club: | 30205252489926 |
| JCB: | 3541963594572595 |
| Maestro: | 6799990100000000019 |
| Credit Card Expiration: | 10/25 |
| account (ACH): | 24413815 |
| routing (ACH): | 490000018 |

## Triggering Errors in Test Mode

- To cause a declined message, pass an amount less than 1.00.
- To trigger a fatal error message, pass an invalid card number.
- To simulate an AVS match, pass 888 in the address1 field, 77777 for zip.
- To simulate a CVV match, pass 999 in the cvv field.

# Example Response  QuickClick

QuickClick buttons will return a response to the 'Finish URL' using a query string which can be read in using GET. Here are the variables that will be passed back:

## Response Variables

- type
- response
- responsetext
- authcode
- avsresponse
- transactionid
- orderid
- amount
- cvvresponse
- first\_name
- last\_name
- address\_1
- address\_2
- company
- city
- state
- country
- phone
- postal\_code
- email
- ip\_address
- key\_id
- action
- product\_sku\_#
- product\_description\_#
- product\_amount\_#
- product\_shipping\_#
- url\_continue
- url\_cancel
- url\_finish
- customer\_receipt
- hash
- referrer\_url
- merchant\_defined\_field\_#

# Finish Methods  QuickClick

Below are some examples of alternative redirect methods available when using QuickClick HTML. This functionality is not available by default through the button generator and must be added after the fact. Enhanced functionality is not available on Link Alternative URLs.

All URLs provided must be fully qualified (Example: http://www.example.com)

## No Return/Redirect:

If no redirection is wanted after the transaction a receipt is displayed, leave the 'Finish URL' field blank in the Button Generator or exclude url\_finish variable from button HTML.

## Standard Return/Redirect:

This displays a receipt to the customer and asks them to click 'Continue' to finalize the order.

When the customer clicks on continue, the non-sensitive transaction response data is returned via GET to the page included. This allows the Merchant's website to record a SUCCESSFUL transaction in cases where a programmer has built logic to read our response.

In the button generator, enter a fully qualified URL in the 'Finish URL' field or include url\_finish variable within the button HTML.

Example:

```html

<input type="hidden" name="url_finish" value="http://www.example.com/finish.html" />

```

## POST Back with No Data:

This displays a receipt to the customer and asks them to click Continue to finalize the order. When the customer clicks on continue, they are sent to the page included but the transaction data is not posted back to that page.

Useful if a return to the website is needed, but the site is not recording the transaction data. Not available through the button generator or link alternative. Code must be customized.

Example:

```html

<input type="hidden" name="return_link" value="http://www.example.com/finish.html" />
<input type="hidden" name="return_method" value="post" />

```

## Skip the Gateway Receipt page:

This skips our receipt page and automatically redirects the consumer to the return link URL automatically without clicking Continue to finalize the order. The transaction data is posted back to the website as normal.

QuickClick will not display success to the customer, so the page must be built/programmed to tell the customer that the charge went through. To use this method, do not include the 'url\_finish' variable within your HTML.

Example:

```html

<input type="hidden" name="return_link" value="http://www.example.com/finish.html" />
<input type="hidden" name="return_method" value="redirect" />

```

# Methodology  Mobile SDK

## Overview

There are two parts to the Mobile SDK, the end-to-end encryption method and the swipe device library.

## End-to-End Encryption

The end-to-end encryption library allows credit card data to be encrypted on a mobile device before sending it to the Merchant's back-end server. During the sale process, the Merchant's server can send the encrypted card data to the Payment Gateway, where it is decrypted and treated like a normal credit card. This gives the merchant more control of mobile transactions without having to increase compliance costs.

The merchant's encryption key is an RSA public key that is unique to them. This means that the encrypted credit card data will only be able to be used to make a transaction in that merchant's payment gateway account. Only the Payment Gateway has access to the private key that corresponds to this public key.

Card data is encrypted using AES encryption with a new randomly generated key for every card. This key is then encrypted with the public key along with the card data. This packet (the encrypted card and AES key) is unreadable to anybody without the private key which is only known to the Payment Gateway.

Note: The public key cannot be used to decrypt an encrypted card. Once encrypted, the card is unusable except by the Gateway when it processes the payment for the merchant. For this reason, there is no need to keep the public key a secret.

## Swipe Device Library

This library supports the encrypted card readers supported by the payment gateway. This includes parsing the data and notifying you when a card reader is connected, disconnected, ready to receive a swipe, etc.

# Using the Library  Mobile SDK: Android

## Creating a Project

The fastest way to get started is to check out the Client Encryption Example project that can be downloaded from the downloads section. Or if you prefer to create your own project, use these steps:

**These directions are specific to Android Studio.** 2. Download and extract the zip file from the integration section of the Payment Gateway.
3. In Android Studio's Quick Start menu, select 'Start a new Android Studio project'.
4. Add SDK to project
1. In the Project view(Alt + F1), select Project in the drop down menu instead of Android on top of the side-bar.
2. Copy and paste the SDK into the libs folder underneath app.
5. Modify gradle build file.
1. Open build.gradle file located in the app directory.
2. Add the following code snippet:

      ```bash
      repositories {
          flatDir {
              dirs 'libs'
          }
      }
      ```

3. In the dependencies section, add this code(replace {applicationId} with the applicationId in your default config):

      ```actionscript
      compile '{applicationId}:payment:gateway@aar'
      ```

## Network Usage Note

You may notice the library attempting to connect to IDTECH's website to download a file. Since the audio jack capabilities of different Android devices vary, the IDTECH Shuttle's library uses different communication settings for each supported device. IDTECH frequently updates a list of the supported devices and the communication settings for each which the library may attempt to download from IDTECH. Internet permission is required.

# End-to-End Encryption  Mobile SDK: Android

## Acquiring a Public Key

1. After logging into the Payment Gateway, navigate to Settings -> Security Keys -> View Mobile SDK Key. You can click on the Java example button to get a version that can easily be copied and pasted into your project.

2. Use the Query API. In order to get the public key, you will need to use 'report\_type=sdk\_key'. The key will be returned in the <sdk\_key> tag.


## Encrypting a Card

The following is an example of the entire encryption process:

```java
import com.SafeWebServices.PaymentGateway.PGEncrypt;

PGEncrypt pg = new PGEncrypt();
Pg. setKey(
    "***999|MIIEEjCCA3ugAwIBAgIBADANBgkqhkiG9w0BAQQFADCBvTELMAkGA1UEBh"
    "MCVVMxETAPBgNVBAgTCElsbGlub2lzMRMwEQYDVQQHEwpTY2hhdW1idXJnMRgwFg"
                    [Several lines omitted]
    "cNAQEEBQADgYEAKY8xYc91ESNeXZYTVxEsFA9twZDpRjSKShDCcbutgPlC0XcHUt"
    "a2MfFPsdgQoq0I8y1nEn1qJiOuEG1t9Uwux4GAvAPzsWSsKyKQkZhqxrxkJUB39K"
    "Pg57pPytfJnlQTgYiSrycCEVHdDvhk92X7K2cab3aVV1+j0rKlR/Sy6b4=***");

PGKeyedCard cardData = new PGKeyedCard(cardNumber, expiration, cvv);
Boolean includeCVV = true;
String encryptedCardData = pg.encrypt(cardData, includeCVV);
```

In this example, 'encryptedCardData' would now contain a string that can be passed to the Payment Gateway in place of credit card information. The parameter name to use when passing this value is 'encrypted\_payment'.

For example, a simple DirectPost API string would look something like this:

(This example assumes your Merchant server is running a PHP script that has received the encrypted card data through a POST parameter called 'cardData'.)

```php

//Business logic, validation, etc.  When ready to process the payment...
$cardData = $_POST['cardData'];
$postString = "security_key=6457Thfj624V5r7WUwc5v6a68Zsd6YEm&type=sale&amount=1.00
                    &encrypted_payment=$cardData";

//Post to Gateway
```

We suggest using POST instead of GET to reduce the possibility of the data being kept in a log file. For more information on how to communicate with the Payment Gateway, see the API documentation.

# Swipe Devices  Mobile SDK: Android

## Permissions

You will need to grant the application multiple permissions in order to use a swipe device. This can be done by modifying the manifest file by adding:

```applescript
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.MOUNT_UNMOUNT_FILESYSTEMS" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.INTERNET" />
```

In the class that intends to handle swipe events, add a PGSwipeController property called swipeController, and then in your init function, initialize the object with this line:

```java
//This example is for the iPS Encrypted Mobile Card Reader
                    swipeController = new PGSwipeController(this, PGSwipeDevice.SwipeDevice.IPS);
```

If you want to change the default settings, you can change them now. Here are some examples:

```java
swipeController.getDevice().setSwipeTimeout(30);
swipeController.getDevice().setAlwaysAcceptSwipe(false);
swipeController.getDevice().setActivateReaderOnConnect(false);
```

Your class will have to implement the PGSwipeListener protocol. If you are only interested in knowing when a card is swiped, you can safely leave every other event handler empty, as shown here (or add your own code to, for example, display an image indicating that the swipe reader is ready for a swipe). In this example, when the swipe is received, the card data is saved in a property (swipedCard) for eventual transmission to the Gateway (not shown), and two TextView variables (cardNumberField and expirationField) are set to show the masked card number and expiration date. If a bad swipe occurs, onSwipedCard is still called, but "card" will be null.

```java
@Override
public void onDeviceConnected(final PGSwipeDevice device)
{
}
@Override
Public void onDeviceDisconnected(final PGSwipeDevice device)
{
}

@Override
public void onDeviceActivationFinished(final PGSwipeDevice device)
{
}
@Override
public void onDeviceDeactivated(final PGSwipeDevice device)
{
}
@Override
public void onDeviceReadyForSwipe(final PGSwipeDevice device)
{
}
@Override
public void onDeviceUnreadyForSwipe(final PGSwipeDevice device,
    PGSwipeDevice.ReasonUnreadyForSwipe reason)
{
}
@Override
public void onSwipedCard(final PGSwipedCard card, final PGSwipeDevice device)
{
    if (card != null) {
      this.runOnUiThread(new Runnable() {
      public void run() {
          TextView cardNumberField = (TextView)findViewById(R.id.cardNumber);
        cardNumberField.setText((CharSequence)card.getMaskedCardNumber());
        }
      }
    } else {
        //A null card means that there was a swipe but it was unsuccessful.    }
}
```

# Classes Overview  Mobile SDK: Android

## PGEncrypt

The PGEncrypt class contains all necessary to encrypt data to be sent to the payment gateway. Merchants wanting to send transaction data to their servers before processing the transaction will want to use this method in order to prevent their server from touching sensitive data.

- void setKey(String key)
This method takes in the public key and sets it to be used with the encrypt method.

- String encrypt(String plaintext)
This method accepts a string to be encrypted. Although any string can be passed, the Payment Gateway will only pull fields related to credit cards from the encrypted text.

- String encrypt(PGCard card, boolean includeCVV)
This is the preferred way of getting the encrypted card data. It will format and encrypt the card data for you to pass on to the gateway.


## PGSwipeDevice

This class represents the functionality that is common to the swipe reader devices. A PGSwipeDevice object is passed along with every even generated by the devices in order to identify the device type and access device-specific features by casting it to the specific swipe device.

- enum ReasonUnreadyForSwipe {DISCONNECTED, TIMED\_OUT, CANCELED, REFRESHING, SWIPE\_DONE }
Used to explain why the device can no longer accept a swipe.

- enum SwipeDevice { UNIMAG, IPS, ENTERPRISE }
Used to identify the type of device being used.

- boolean getIsConneced()
Returns true if the swipe device is connected.

- boolean getIsActivated()
Returns true if the swipe device is activated.

- boolean getIsReadyForSwipe()
Returns true if the swipe device is ready.

- SwipeDevice getDeviceType()
Returns the current device type.

- void setListener(SwipeListener value)
Sets the event listener.

- boolean setSwipeTimeout(int seconds)
Sets the timeout interval for the swipe device.

- void setAlwaysAcceptSwipe(boolean alwaysAcceptSwipe)
True by default, if this is set to false, a swipe must be requested once the device is ready.

- void setActivateReaderOnConnect(boolean activateReaderOnConnect)
True by default, if this is to false, the device must be activated before it can be used.

- boolean requestSwipe()
Notifies the reader to start waiting for a swipe. The device must be active before this can be called.

- void cancelSwipeRequest()
Cancels a swipe request.

- void stopSwipeController()
Cancels the current swipe request, unregisters the swipe device, and frees resources. Will not receive any information from the device until it is resumed.

- void restartSwipeController()
Registers the swipe device. Should only be called after calling stopSwipeController()

- String getDefaultMsg()
Returns the default message for the current device state.


## PGSwipeEnterprise extends PGSwipeDevice

This class handles communications with the iPS Enterprise Encrypted Mobile Card Reader.

- void InitializeReader(Context ctx)
This class is not intended to be instantiated directly. Instantiate a PGSwipeController instead. The PGSwipeController will create a PGSwipeEnterprise instance to interact with the iPS Enterprise device.


## PGSwipeIPS extends PGSwipeDevice

This class handles communications with the iPS Encrypted Mobile Card Reader.

- void InitializeReader(Context ctx)
This class is not intended to be instantiated directly. Instantiate a PGSwipeController instead. The PGSwipeController will create a PGSwipeIPS instance to interact with the IPS device.


## PGSwipeUniMag extends PGSwipeDevice

This class handles communication with the IDTECH Unimag device.

- void InitializeReader(Context ctw)
This class is not intended to be instantiated directly. Instantiate a PGSwipeController instead. The PGSwipeController will create an instance of PGSwipeUniMag to interact with the Shuttle device.

- void updateCompatableDeviceList()
The UNIMAG device uses an xml compatibility list that consists of specific device settings that are unique to every device. This function should be called to handle new devices.


## PGCard

This is a simple base class for the different types of cards that can be used. There is no reason to ever explicitly declare this.

- void setCVV(String CVV)
Sets the CVV for the credit card data.

- String getCVV()
Returns the CVV for the card.

- String getDirectPostString(boolean includeCVV)
Returns a query string consisting of the card data that can be passed to the Payment Gateway through the Payment API.


## PGKeyedCard extends PGCard

This class should be used when accepting credit card information from a keyboard.

- PGKeyedCard(String ccnumber, String expiration, String cvv)
The standard constructor for this class. It should be used most of the time.

- PGKeyedCard(String ccnumber, String expiration, String cvv, String startDate, String issueNum)
This constructor accepts two more values that would be used for Maestro cards.

- void setCardNumber(String value)
Sets the card number to be used for the current card.

- void setExpirationDate(String value)
Sets the expiration date to be used for the current card.

- void setCardStartDate(String value)
Sets the start date for the current card.

- void setCardIssueNumber(String value)
Sets the issue number for the current card.

- String getCardNumber()
Returns the current card number.

- String getExpirationDate()
Returns the current expiration date.

- String getCardStartDate()
Returns the current start date.

- String getCardIssueNumber()
Returns the current issue number.


## PGSwipedCard extends PGCard

This class should only be used along with an unencrypted swipe device.

- PGSwipedCard(String track1, String track2, String track3, String cvv)
The constructor that sets the card data accordingly.

- void setTrack1(String value)
Sets track1 for the current card.

- void setTrack2(String value)
Sets track2 for the current card.

- void setTrack3(String value)
Sets track3 for the current card.

- void setMaskedCardNumber(String value)
Sets the masked card number for the current card.

- void setCardholderName(String value)
Sets the name on the current card.

- void setExpirationDate(String value)
Sets the expiration date for the current card.

- String getTrack1()
Returns the track1 data.

- String getTrack2()
Returns the track2 data.

- String getTrack3()
Returns the track3 data.

- String getMaskedCardNumber()
Returns the masked card number. This should be used when trying to display card information to the user.

- String getCardholderName()
Returns the name on the card.

- String getExpirationDate()
Returns the expiration date.


## PGEncryptedSwipedCard extends PGSwipedCard

This class should be used for all encrypted swipe devices.

- PGEncryptedSwipedCard(String track1, String track2, String track3, String ksn, String cvv)
The constructor accepts all class variables.

- void setKsn(String value)
Sets the KSN that is used to decrypt the card information at the gateway.

- String getKsn()
Returns the KSN.


## PGSwipeController

The PGSwipeController class is used to maintain the swipe device.

- PGSwipeController(Object source, PGSwipeDevice.SwipeDevice deviceType)
This constructor sets the type of device to be used and initializes it.

- PGSwipeController(SwipeListener listener, Context ctx, PGSwipeDevice.SwipeDevice deviceType)
This constructor can be used if the activity can not be passed. It also sets the type of device to be used and initializes it.

- PGSwipeDevice getDevice()
Returns the device that is currently initialized. Only one should be initialized at a time.

- PGSwipeEnterprise getEnterprise()
Can be used instead of getDevice, will produce the same result as long as an IPS Enterprise device is being used.

- PGSwipeIPS getIPS()
Can be used instead of getDevice, will produce the same result as long as an IPS device is being used.

- PGSwipeUniMag getUnimag()
Can be used instead of getDevice, will produce the same result as long as a UNIMAG device is being used.


## PGSwipeController.SwipeListener

This interface must be implemented in order to receive events from the card readers

- void onSwipedCard(PGSwipedCard card, PGSwipeDevice swipeDevice)
Method called when a card is swiped. It accepts the card data and the device used.

- void onDeviceReadyForSwipe(PGSwipeDevice swipeDevice)
Called when the device is ready to read a swipe.

- void onDeviceUnreadyForSwipe(PGSwipeDevice swipeDevice, PGSwipeDevice.ReasonUnreadyForSwipe reason)
Is called when the device can no longer read a card. It is passed the device and the reason it can no longer accept a swipe.

- void onDeviceConnected(PGSwipeDevice swipeDevice)
This method is called when the swipe device is connected.

- void onDeviceDisconnected(PGSwipeDevice swipeDevice)
This method is called when the swipe device is unplugged from the android device.

- void onDeviceActivationFinished(PGSwipeDevice swipeDevice)
This method is called when a swipe can be requested.

- void onDeviceDeactivated(PGSwipeDevice swipeDevice)
This method is called when the device is stopped. Once this is called, the device has to be restarted to function again.


# Using the Library  Mobile SDK: iOS

## Creating a Project

The fastest way to get started is to check out the PaymentGatewayEncryptionExample and PaymentGatewaySwipeExample projects that can be downloaded from the Payment Gateway's Integration section. If you prefer to create your own project instead, use these steps (current as of Xcode 6.0):

1. Download the Mobile SDK .zip file from the Integration Portal by using the "Downloads" link under the Mobile SDK section. This file contains both the iOS and Android libraries.
2. Create a new Xcode Project.
3. Add PGMobileSDK.a and PGMobileSDK directory containing the headers to your project. These are found in the .zip file under Apple iOS -> Payment Gateway SDK.
4. Under the project's Build Phases settings, add these libraries to the Link Binary With Libraries section:
   - AudioToolbox.framework
   - AVFoundation.framework
   - ExternalAccessory.framework
   - MediaPlayer.framework
   - Security.framework
   - CoreBluetooth.framework
   - libc++.tbd
   - PGMobileSDK.a
5. (Optional - see note below) - In your Info.plist, add a row for "Supported external accessory protocols", and add "com.gatewayprocessingservices.iprocess" as Item 0. This enables connection to the iDynamo swipe reader.

Note: You may wish to skip step 5 if you do not need to support the iDynamo. Apple requires manufacturers of accessories that use the dock connector to add your app to their product plan before approving your app for the app store. You will need to contact MagTek in order to have your app added to their product plan. Contact MagTek for more details.

## Viewing documentation in Xcode

Adding the doc set to Xcode allows the most up-to-date, relevant documentation to appear in the IDE as you type. To enable access to the SDK documentation from inside Xcode:

1. Under the Xcode menu, click Preferences
2. Navigate to the Downloads page
3. On the Documentation tab, click Add.
4. On the "Enter a doc set feed URL" window that pops up, enter: https://secure.safewebservices.com/merchants/resources/integration/docset/iOSSDK.atom
5. Click Add
6. Click the newly-added install button

## Important Info About the App Store

The Apple App Store's current policy is to require mobile apps to purchase digital goods (e.g. downloadable content, etc.) through the App Store. For that reason, this SDK is intended only for use in apps selling real-world goods and services. Please direct questions about Apple's App Store policies to Apple. Their policies are subject to change at their discretion.

# End-to-End Encryption  Mobile SDK: iOS

## Acquiring a Public Key

1. After logging into the Payment Gateway, navigate to Settings->Security Keys->View Mobile SDK Key. You can click on the Objective-C example link to get a version that can easily be copied and pasted into your project.

2. Use the Query API. In order to get the public key, you will need to use 'report\_type=sdk\_key'. The key will be returned in the <sdk\_key> tag.


## Encrypting a Card

```objectivec
#import "PGEncrypt.h"
#import "PGCards.h"

PGEncrypt encryption = [[PGEncrypt alloc] init];
[encryption setKey:\
    @"***999|MIIEEjCCA3ugAwIBAgIBADANBgkqhkiG9w0BAQQFADCBvTELMAkGA1UEBh"\
    "MCVVMxETAPBgNVBAgTCElsbGlub2lzMRMwEQYDVQQHEwpTY2hhdW1idXJnMRgwFg"\
                    [Several lines omitted]\
    "cNAQEEBQADgYEAKY8xYc91ESNeXZYTVxEsFA9twZDpRjSKShDCcbutgPlC0XcHUt"\
    "a2MfFPsdgQoq0I8y1nEn1qJiOuEG1t9Uwux4GAvAPzsWSsKyKQkZhqxrxkJUB39K"\
    "Pg57pPytfJnlQTgYiSrycCEVHdDvhk92X7K2cab3aVV1+j0rKlR/Sy6b4=***"];

PGCard *cardData = [[PGKeyedCard alloc] initWithCardNumber:cardNumberField.text\
                                            expirationDate:expirationField.text\
                                                       cvv:cvvField.text];

NSString *encryptedCardData = [encryption encrypt:cardData includeCVV:NO];
```

encryptedCardData will contain a string that can be passed to the Payment Gateway in place of credit card information. The parameter name to use when passing this value through DirectPost is "encrypted\_payment". For example, a simple DirectPost API string would look something like this:

(This example assumes your Merchant server is running a PHP script that has received the encrypted card data through a POST parameter called 'cardData'.)

```php

//Business logic, validation, etc.  When ready to process the payment...
$cardData = $_POST['cardData'];
$postString = "security_key=6457Thfj624V5r7WUwc5v6a68Zsd6YEm&type=sale&amount=1.00
                    &encrypted_payment=$cardData";

//Post to Gateway
```

For more information on how to communicate with the Payment Gateway, see the API documentation.

# Swipe Devices  Mobile SDK: iOS

## Creating the Controller

In the class that intends to handle swipe events, create a PGSwipeController object in your init method. Initialize the object with one of these lines to support specific readers:

```objectivec
swipeController = [[PGSwipeController alloc] initWithDelegate:self\
                    audioReader:AudioJackReaderIpsEnterprise];
```

```objectivec
swipeController = [[PGSwipeController alloc] initWithDelegate:self\
                    audioReader:AudioJackReaderUnimag];
```

Only a single model of audio jack-connected reader can be enabled at a time. The audioReader parameter allows you to choose which type you want to allow. See the PGSwipeController's initWithDelegate:audioReader: documentation for more details.

Your class will have to implement the PGSwipeDelegate protocol. If you are only interested in knowing when a card is swiped, you can safely leave every other event handler empty, as shown here (or add your own code to, for example, display an image indicating that the swipe reader is ready for a swipe). In this example, when the swipe is received, the card data is saved in a property (swipedCard) for eventual transmission to the Gateway (not shown), and two UITextField properties (cardNumberField and expirationField) are set to show the masked card number and expiration date.

If a bad swipe occurs, didSwipeCard:device: may still be called, but "card" will be nil. An error message is displayed in this example. Note: Not all card reader models give feedback when a bad swipe is received.

```objectivec
-(void)deviceConnected:(PGSwipeDevice *)sender
{
}

-(void)deviceDisconnected:(PGSwipeDevice *)sender
{
}

-(void)deviceActivationFinished:(PGSwipeDevice *)sender result:(SwipeActivationResult)result
{
}

-(void)deviceDeactivated:(PGSwipeDevice *)sender
{
}

-(void)deviceBecameReadyForSwipe:(PGSwipeDevice *)sender
{
}

-(void)deviceBecameUnreadyForSwipe:(PGSwipeDevice *)sender reason:(SwipeReasonUnreadyForSwipe)reason;
{
}

-(void)didSwipeCard:(PGSwipedCard *)card device:(PGSwipeDevice *)sender
{
    if (card != nil) {

        swipedCard = [card retain];

        cardNumberField.text = card.maskedCardNumber;
        expirationField.text = card.expirationDate;

    } else {

        //A nil card means that there was a swipe but it was unsuccessful.
        UIAlertView *alert = [[UIAlertView alloc] initWithTitle:@"Swipe Error"\
                                                        message:@"The reader was not able to read the card. Please Try Again."\
                                                       delegate:nil\
                                              cancelButtonTitle:@"OK"\
                                              otherButtonTitles:nil];

        [alert show];
        [alert release];
    }

}
```

# Classes Overview  Mobile SDK: iOS

## PGSwipeController

The PGSwipeController contains a set of swipe reader classes that control individual swipe readers. This is the main Mobile Swipe SDK class required for using swipe devices, intended to be instantiated near the app's startup. The delegate you set on the PGSwipeController is the object that will receive all of the SDK's swipe events.

Through this class, you can access the controller classes for individual swipe device types (PGSwipeIpsEnterprise \* ipsEnterpriseReader, PGSwipeIDynamo \*iDynamoReader, and PGSwipeUniMag \*uniMagReader).

You should be sure to call initWithDelegate rather than the parameterless init because during initialization a check is made to see if any devices are already connected and sends a deviceConnected event if they are. If the parameterless init is used, the initial connection message will be missed.

- -(id)initWithDelegate:(id<PGSwipeDelegate>)delegate audioReader:(AudioJackReaderType)readerType
Initializes the PGSwipeController and the individual swipe reader classes. Init checks if any devices are connected and sends a deviceConnected event if they are, so initWithDelegate: should always be used rather than init to ensure that a connection event is received if the device is already connected.

The audioReader: parameter selects which type of audio jack-connected card reader to enable. Only one type of audio jack-connected reader can be used at a time to prevent more than one device library from attempting to access the audio system at the same time. AudioJackReaderIpsEnterprise enables the IPS Enterprise Encrypted Card Reader library, and AudioJackReaderUnimag enables the Shuttle library. You may also select AudioJackReaderNone to disable both libraries, or AudioJackReaderAutodetectOnConnect to allow the SDK to attempt to determine the type on connection. Autodetection has several drawbacks. See PGSwipeController beginAutodetectAudioJackCardReader for more information.

- -(void)setAudioJackReaderType:(AudioJackReaderType)audioJackReaderType messageOptions:(PGSwipeUniMagMessageOptions \*)messageOptions
Sets the enabled audioJackReaderType. This can be used to enable support for either the IPS Enterprise Encrypted Card Reader or the UniMag (Shuttle) reader. Since the underlying libraries may not always unload cleanly, you should avoid calling this repeatedly to change the supported device type. Doing so could cause the reader to malfunction or be damaged. Setting this to AudioJackReaderAutodetectOnConnect will disable any currently selected audioJackReaderType and autodetect upon device connection.

messageOptions will be used only when audioJackReaderType is AudioJackReaderUnimag to replace the default message options. For any other AudioJackReaderType, or to use the default message options for AudioJackReaderUnimag, this should be nil.

- -(void)beginAutodetectAudioJackCardReader;
Asynchronously attempts to detect the card reader type currently attached to the audio jack.

A communication test is first attempted for an IPS Enterprise reader, then an attempt is made to power up a UniMag (Shuttle) card reader. If either test succeeds, the audioJackReaderType is set to the correct value, and the device will be made ready for use. The result of the autodetect is reported to the delegate through deviceAutodetectComplete:.

Note: All tests produce very loud tones through the audio jack. If speakers or headphones are attached, the tones would be unpleasant to the user. It is recommended that the user be warned and allowed to remove headphones before calling this function. This library suppresses user notifications from the UniMag reader during autodetect.

Because the device is powered up in order to test it, you will not receive connection / activation / ready for swipe events during detection. When your delegate receives its deviceAutodetectComplete message, check the isConnected, isActive, and isReadyForSwipe properties for its current state and to complete any initialization.

In order to detect the devices, all of the underlying card reader libraries must be loaded. Under some circumstances, these libraries may not unload cleanly, resulting in unreliable use of the card reader. Autodetect is also a very slow process. For these reasons, you should not rely on autodetection for each use of the app.

Because communication through the audio jack is not always perfect, autodetect does not always return a correct result. The most common failure type is returning CardReaderAutodetectResultFail even though a supported device is connected.

If it is known in advance which card reader type will be used, that type should be specified when initializing the PGSwipeController. If multiple devices must be supported, it is strongly recommended that the result of the autodetect be saved (e.g. in NSUserDefaults) and re-used on app startup.


## PGSwipeDevice

The PGSwipeDevice class represents the functionality that is common to the swipe reader devices.

A PGSwipeDevice object is passed along with every event generated by the swipe devices to allow you to identify the device type and access device-specific features by casting to the specific swipe type.

- bool isConnected
True when the reader is physically attached to the device.

- bool isActivated
True when the reader is powered up / initialized.

- bool isReadyForSwipe
True when the reader is able to accept card swipes from the user.

- id<PGSwipeDelegate>delegate
Sets the delegate that will receive the device's events. You should not set the delegate directly. Setting the delegate on the PGSwipeController sets the delegate for each of its members.


## PGSwipeDelegate

The PGSwipeDelegate protocol must be implemented by the class that intends to receive swipe reader events. The following event handlers will need to be implemented.

- -(void)didSwipeCard:(PGSwipedCard \*)card device:(PGSwipeDevice \*)sender
This event is sent whenever the user swipes a card. Normally "card" will be either a PGEncryptedSwipedCard or PGMagnesafeSwipedCard (depending on the swipe reader) with track data, masked card number, expiration date, and cardholder name. If the swiped card cannot be read, "card" will be nil.

- -(void)deviceBecameReadyForSwipe:(PGSwipeDevice \*)sender
This event is sent when isReadyForSwipe becomes true. Between this event and the receipt of deviceBecameUnreadyForSwipe, any swipe should produce a didSwipeCard event.

- -(void)deviceBecameUnreadyForSwipe:(PGSwipeDevice \*)sender
reason:(SwipeReasonUnreadyForSwipe)reason
This event is sent when isReadyForSwipe becomes false. There are many reasons the reader could become unready to receive swipe events, e.g. the swipe request times out, the device is disconnected, etc. Check the value of "reason" to determine the cause.

On Shuttle readers, if you have set the device to alwaysAcceptSwipe, the reason may be set to SwipeReasonUnreadyForSwipeRefreshing. In that case, there is no need to request a new swipe. The "unready" state is momentary while the device automatically renews after a timeout, swipe, or other event.

- -(void)deviceConnected:(PGSwipeDevice \*)sender;
Occurs when the reader is physically connected to the device. With audio-port connected devices, this event can be sent when the user attaches headphones.

- -(void)deviceDisconnected:(PGSwipeDevice \*)sender;
Occurs when the reader is physically disconnected from the device. With audio-port connected devices, this event can be sent when the user detaches headphones.

- -(void)deviceActivationFinished:(PGSwipeDevice \*)sender
result:(SwipeActivationResult)result;
Occurs when the device has finished an attempt to power up/initialize. This may occur at the same time as deviceConnected or later, depending on the device and settings. See the individual device documentation for specifics.

Receiving this event does not mean the initialization succeeded. Be sure to check the value of "result" to verify that it is SwipeActivationResultSuccess.

- -(void)deviceDeactivated:(PGSwipeDevice \*)sender;
Occurs when the device has powered down. This may occur when the device is disconnected or, for certain swipe readers, when you make a call to power down the device.

- -(void)deviceAutodetectStarted;
Occurs when an attempt to detect the type of an audio jack-connected card reader has started. This can be triggered by a manual call to PGSwipeController beginAutodetectAudioJackCardReader or automatically when the PGSwipeController is in AudioReaderAutodetectOnConnect mode and an object is attached to the audio jack by the user.

- -(void)deviceAutodetectComplete:(CardReaderAutodetectResult)result;
Occurs when an attempt to detect the type of an audio jack-connected card reader has finished. The result may be CardReaderAutodetectResultIpsEnterprise, CardReaderAutodetectResultUniMag, or CardReaderAutodetectResultFail if the type could not be determined.

When this message is received, the PGSwipeController's audioJackReaderType will have been set to the appropriate value and the card reader will be activated. Since the device is powered up while autodetecting, no events for connection, activation, or readyForSwipe will be received. Check the isConnected, isActivated, and isReadyForSwipe properties to determine the device's state.


## PGSwipeIpsEnterprise

This class is the interface to the IPS Enterprise Encrypted Card Reader. It is not intended to be instantiated directly. Instantiate a PGSwipeController instead. The PGSwipeController will create a PGSwipeIpsEnterprise instance to interact with the IPS Enterprise device.

- id delegate;
Gets or sets the delegate that will receive events. You should not set this directly. When the PGSwipeController's delegate is set, it will pass it through to this delegate.

- -(void)shutdown;
Closes the card reader's connections and disables event handling to allow it to be deallocated. You should not call this directly. It is called by the PGSwipeController when necessary.

- -(void)beginTestCommunication(id)delegate;
Asynchronously sends a communication test message to the card reader device and waits for a response. This can be used to detect whether the connected device is an IPS Enterprise Encrypted Card Reader. A message is sent via the audio jack and if no response is received from the device within 5 seconds, the attached object is assumed not to be an IPS Enterprise reader. Note that calling this will produce a short, loud tone through the audio jack if headphones are attached.

The result is returned to the delegate by calling ipsEnterpriseCommunicationTestCompleteWithResult:(BOOL)succes with success set to YES or NO, depending on if a response was sent by the device.


## PGSwipeIDynamo

This class is the interface to the iDynamo reader. It is not intended to be instantiated directly. Instantiate a PGSwipeController instead. The PGSwipeController will create a PGSwipeIDynamo instance to interact with the iDynamo device.

The iDynamo has no configurable options. When the device is attached, it is active and ready for swipe. The only property for the PGSwipeIDynamo class is a delegate to receive events, which should not be set directly. When the delegate is set for the PGSwipeController, the same delegate is passed to the PGSwipeIDynamo instance it contains.

## PGSwipeUniMag

This class is the interface to the IDTECH Shuttle reader. It is not intended to be instantiated directly. Instantiate a PGSwipeController instead. The PGSwipeController will create a PGSwipeUniMag instance to interact with the Shuttle device.

There are several flags and methods available for the Shuttle. For an app that does not need much specific control of the swipe device and is mostly interested in the swipe event, the defaults can be kept and the device will power up and become ready for swipe when attached.

- id delegate;
Gets or sets the delegate that will receive events. You should not set this directly. When the PGSwipeController's delegate is set, it will pass it through to this delegate.

- PGSwipeUniMagMessageOptions \*messageOptions;
Contains a set of options for interactions with the user, e.g. whether to prompt before powering up the Shuttle and the text of error messages. See the PGSwipeUniMagMessageOptions section for specific settings.

- BOOL activateReaderOnAttach;
If this is true, the SDK will attempt to power-up the reader when attachment is detected. There are 3 things to be aware of:

1. If the user attaches headphones to the mobile device, it will be treated as a swipe reader and an attempt to power it up will be made.
2. Before the attempt to activate the reader, if messageOptions.activateReaderWithoutPromptingUser is set to false (it is false by default), the user will receive a prompt asking to confirm activation. If they decline, no activation will be attempted.
3. If you call powerDown to deactivate the device, leaving activateReaderOnAttach set to true will cause the device to immediately power back up.
- BOOL automaticallySetVolumeToMaxOnActivate;
If this is set to true, the device's volume will be set to maximum immediately before any attempt to power on the reader. Since the reader requires full volume to activate, this defaults to true and should normally remain true.

- BOOL alwaysAcceptSwipe;
The Shuttle does not accept swipes from the user unless a swipe has been requested. If alwaysAcceptSwipe is true, the SDK will immediately request a swipe and renew the request any time the old swipe request times out or ends. You will still receive periodic didBecomeUnreadyForSwipe: messages, but the reason will be SwipeReasonUnreadyForSwipeRefreshing to indicate that you should be receiving a didBecomeReadyForSwipe: message immediately after without any interaction.

The mobile device's battery may deplete faster if the swipe reader is always awaiting a swipe. If battery life is a concern, consider setting this to false and using requestSwipe when a swipe is expected, or only setting alwaysAcceptSwipe to true when a swipe is expected.

If alwaysAcceptSwipe is true, you should not use requestSwipe or cancelSwipeRequest. By default, alwaysAcceptSwipe is true.

- -(void)powerUpDevice:(BOOL)powerUp;
Powers up the reader if powerUp is true or cancels a power up if powerUp is false. If activateReaderOnAttach is true, this is called automatically after connection to power up the device. If you wish to only power up the device after user interaction, you should wait until a deviceConnected: event is received, then call powerUpDevice:YES when they choose to power up. This should only be used if activateReaderOnAttach is false.

- -(void)powerDown;
Powers down the reader. This may extend mobile device battery life. A deviceConnected event will be received after shut-down, which will trigger a power-up if activateReaderOnAttach is true, so be sure to set activateReaderOnAttach to false before powering down. It is not necessary to power down the reader before disconnecting it from the device.

- -(void)requestSwipe;
Starts listening for swipe events. You will never need to call this if you set alwaysAcceptSwipe to true (it is true by default). After receipt of a didBecomeUnreadyForSwipe message, you may request a new swipe (unless the reason is SwipeUnreadyForSwipeReasonRefreshing). The request will timeout after 20 seconds, or the amount of time you set in setSwipeTimeoutDuration:.

- -(void)cancelSwipeRequest;
Cancels a swipe request to stop listening for swipe events. You should not use this if you did not manually start the swipe request with a call to requestSwipe.

- -(void)setSwipeTimeoutDuration:(int)seconds;
Sets the time between requestSwipe and when swipes will no longer be accepted. Default and maximum are 20 seconds. The minimum is 3 seconds. This still applies even if alwaysAcceptSwipe is true, but the swipe request will be automatically renewed in that case.


## PGSwipeUniMagMessageOptions

This class contains a set of user-interaction options for the Shuttle device.

- BOOL activateReaderWithoutPromptingUser;
If this is set to true (false by default), the reader is activated automatically immediately after you receive a deviceConnected: event. If this is false, you will need to call powerUpDevice: during or after the deviceConnected event to power the device or cancel powering up.

- BOOL showInitializingReaderMessage;
If true, an "Initializing Card Reader…" alert is shown while the reader powers up and is dismissed once power-up completes.

- NSString \*cardReaderActivationPrompt;
Gets or sets the prompt that will be displayed to confirm that the user would like to power up the reader. If you change this prompt, you should also change cardReaderActivationAtMaxVolumePrompt. Note: an activation prompt is only shown before activation if messageOptions.activateReaderWithoutPromptingUser is false. This message is meant to include a warning to indicate that the volume will be set to max. If automaticallySetVolumeToMaxOnActivate is false, cardReaderActivationAtMaxVolumePrompt is shown instead of this.

- NSString \*cardReaderActivationAtMaxVolumePrompt;
Gets or sets the prompt that will be displayed to confirm that the user would like to power up the reader. If you change this prompt, you should also change cardReaderActivationPrompt. Note: an activation prompt is only shown before activation if messageOptions.activateReaderWithoutPromptingUser is false. If automaticallySetVolumeToMaxOnActivate is true and the volume is not at maximum, cardReaderActivationPrompt is shown instead of this.

- NSString \*cardReaderTimeoutMessage;
Gets or sets the alert that is shown if the reader times out while attempting to power up. If you prefer to handle this differently, set this message to nil to prevent it from being shown, then handle the activationDidComplete:result: message with a result of SwipeActivationResultTimeout.

- NSString \*volumeTooLowMessage;

## Supported Devices

**IPS Enterprise and IPS Encrypted Card Readers**

The IPS devices are audio jack-connected card readers. Unlike the IDTECH Shuttle, these readers are powered by an internal battery. The IPS devices have a fast startup time and do not produce a constant tone through the audio jack.

Because the IPS devices connect through the audio port and there is no way to immediately detect the device type, you will receive a deviceConnected: event even if the user has only plugged in headphones. Since there is no activation with the IPS devices, a deviceActivated: and deviceBecameReadyForSwipe: will also be sent immediately. In order to be sure that the device is an IPS Enterprise or IPS, the PGSwipeIpsEnterprise and PGSwipeIps provide a beginTestCommunication: method you can use to attempt to communicate with the devices. Success is returned when the device has been successfully identified. This is not done by default to eliminate a delay before the device becomes active.

Both Android and iOS SDKs support the iPS Enterprise Encrypted Card Reader and the UniMag Card Reader. The legacy iPS Encrypted Reader is only supported on Android.

**iDynamo**

The iDynamo connects to the mobile device via Apple's dock connector and is only compatible with iOS devices that use the older 30-pin (non-Lightning) dock connector.

When physically attached, the iDynamo is almost immediately ready to receive swipe events. When connected, the Swipe Delegate should expect a deviceConnected: message, immediately followed by a deviceActivationFinished: message, then a deviceBecameReadyForSwipe: message.

When the device is physically detached, the delegate receives the events in reverse order, i.e. deviceBecameUnreadyForSwipe:, deviceDeactivated:, deviceDisconnected:.

**App Store:** To support the iDynamo on an app distributed through the App Store, Apple may require you to contact MagTek for information before they will process your submission. To disable iDynamo support, do not add it to "Supported external accessory protocols" in your info.plist. You will still receive connect and disconnect events, but activation will fail, so be sure to check if the sending device is the iDynamo object and ignore it if so.

**Known Issue with the iDynamo:** There is an issue with device disconnection with the iDynamo and iOS's ExternalAccessory framework. Upon disconnection, the stream communicating with the device is closed, during which you may receive the warning: _\[NSCondition dealloc\]: condition (<NSCondition: 0x1d54ce90> '(null)') deallocated while still in use._ After reconnecting, a later disconnect may randomly cause the app to crash with an attempt to send a message to the deallocated instance. This does not occur frequently, and is more likely to occur when rapidly opening and closing the application (which sends a disconnect followed by a reconnect when the app re-opens). This issue is with Apple's accessory-handling framework. Apple is aware of the issue and may fix it in a future iOS release.

**IDTECH Shuttle**

The Shuttle (referred to in code as a UniMag device) is an audio jack-connected card reader. It is powered by a tone from the iPod / iPad / mobile phone. Before the Shuttle can receive swipes, it must be powered up.

Because the Shuttle connects through the audio port and there is no way to detect the device type until the device is activated, you will receive deviceConnected events whenever any device is attached to that port. For example, if the user attaches headphones, you will receive a connection event from the Mobile SDK.

The Mobile SDK can be configured to automatically attempt to power on the swipe reader immediately (this is the default), or you can disable the automatic activation and only activate the device when desired (e.g. on a payment screen, or when the user clicks a button).

Important: When powering on the device, the audio volume must be at maximum (done automatically by default). The tone generated through the audio port to activate the device can be very painful to a listener if they have connected speakers or headphones. For this reason, swipeController.uniMagReader.messageOptions.activateReaderWithoutPromptingUser is set to NO by default, causing the SDK to prompt the user for confirmation before activating the reader.

The Shuttle saves battery by only allowing swipes when a swipe has been requested, and a timeout occurs if a swipe is not received quickly enough (20 seconds by default). For simplicity, the SDK defaults to automatically requesting a swipe on activation and continuously renewing the swipe request. If you have issues with battery life, you can set swipeController.uniMagReader.alwaysAcceptSwipe to NO and manually call \[swipeController.uniMagReader requestSwipe\] when ready for a swipe.

# Payment Device SDK for iOS/Android

[View Available Payment Device SDKs](https://docs.nmi.com/docs/device-sdk-ios-android#/)

## Overview

The Payment Device SDK for iOS/Android allows developers to create software that integrates with mobile Bluetooth payment terminals. The SDK abstracts many of the complexities of interacting with terminals so that you can focus on building great apps.

# Payment Device SDK for Windows/Linux

[Download for Windows](https://secure.easypaydirectgateway.com/gw/merchants/resources/integration/download.php?document=sdk_windows&tid=0ad10c2cc375855565ac2c3d7826f4b5) [Download for Linux](https://secure.easypaydirectgateway.com/gw/merchants/resources/integration/download.php?document=sdk_linux&tid=0ad10c2cc375855565ac2c3d7826f4b5)

## Overview

The Payment Device SDK for Windows/Linux allows developers to create software that integrates with numerous payment terminals suppoted by the gateway. The SDK abstracts many of the complexities of interacting with terminals so that you can focus on building great software.

The SDK works with the following payment terminals, all of which need to be purchased through the merchant's gateway provider.

- Ingenico Lane/3000
- Ingenico Lane/5000
- Ingenico Lane/7000
- Ingenico iPP320
- Ingenico iSC250
- Verifone VX820
- Verifone MX915

The SDK also works with these additional payment devices, but must be purchased by contacting support.

- Ingenico iSelf LE (v4)
- Ingenico iSelf 150b
- Ingenico iUC285 Standard and US
- Verifone UX 300
- Miura M020
- Miura M021
- Ingenico Self 2000
- Ingenico Self 3000
- Ingenico Self 4000
- Ingenico Self 4000 LE
- Ingenico Self 5000
- Ingenico Self 5000 LE
- Ingenico Self 7000/8000

**Current SDK Version: Cherry Blossom (3.20) replacing Okami (3.19)**

**Cherry Blossom** succeeds **Ōkami**, blending resilience with a new season of change.

```basic

' ***** DISCLAIMER *****
' This code is to be used as an example and not in production.
' It lacks thorough testing and debugging.  The Results below will be
    ' returned when posting against a gateway Test Account or an Active Account with Test Mode Enabled

GatewaySecurityKey = "[[Gateway Security Key Here]]"

' Returns True on Success, False on Failure
Function GatewaySale(amount, ccnumber, ccexp, cvv, name, address, zip)
    Set OGateway = Server.CreateObject("MSXML2.ServerXMLHTTP")
    OGateway.Open "POST", "https://secure.easypaydirectgateway.com/api/transact.php", false
    OGateway.setRequestHeader "Content-Type", "application/x-www-form-urlencoded"
    DataToSend = "security_key=" & Server.URLEncode(GatewaySecurityKey) &_
             "&ccnumber=" & Server.URLEncode(ccnumber) &_
             "&ccexp=" & Server.URLEncode(ccexp) &_
             "&cvv=" & Server.URLEncode(cvv) &_
             "&amount=" & Server.URLEncode(amount) &_
             "&firstname=" & Server.URLEncode(name) &_
             "&address1=" & Server.URLEncode(address) &_
             "&zip=" & Server.URLEncode(zip)

    OGateway.Send DataToSend

    ResponseString = OGateway.responseText
    Results = Split(ResponseString, "&")

    GatewaySale = False
    For Each i in Results
        Result = Split(i,"=")
        If UBound(Result)>0 Then
            If  LCase(Result(0))="response" Then
                If Result(1) = "1" Then
                    GatewaySale = True
                End If
            End If
        End If
    Next
End Function

Results = GatewaySale("10.00","4111111111111111","0112","","John Smith","123 Main St", "60123")
Response.Write("This should be true: " & Results & "")

Results = GatewaySale("0.99","4111111111111111","0112","","John Smith","123 Main St", "60123")
Response.Write("This should be false: " & Results & "")
```

```csharp

///###########################################################
///#                                                         #
///#  D I S C L A I M E R                                    #
///#                                                         #
///#  WARNING: ANY USE BY YOU OF THE SAMPLE CODE PROVIDED    #
///#  IS AT YOUR OWN RISK.                                   #
///#                                                         #
///#  This code is provided "as is" without                  #
///#  warranty of any kind, either express or implied,       #
///#  including but not limited to the implied warranties    #
///#  of merchantability and/or fitness for a particular     #
///#  purpose.                                               #
///#                                                         #
///#                                                         #
///###########################################################

///###########################################################
///#                                                         #
///#  Payment API Transaction Submission Methodology         #
///#                                                         #
///###########################################################
///#                                                         #
///#  1. You gather all the required transaction data on     #
///#  your secure web site.                                  #
///#                                                         #
///#  2. The transaction data gets submitted (via HTTPS      #
///#  POST) to the gateway as one long string, consisting    #
///#  of specific name/value pairs.                          #
///#                                                         #
///#  3. When performing the HTTPS POST operation, you       #
///#  remain on the same web page from which you've          #
///#  performed the operation.                               #
///#                                                         #
///#  4. The Gateway immediately returns a transaction       #
///#  response string to the same web page from which you    #
///#  have performed the HTTPS POST operation.               #
///#                                                         #
///#  5. You may then parse the response string and act      #
///#  upon certain response criteria, according to your      #
///#  business needs.                                        #
///#                                                         #
///#                                                         #
///###########################################################

<%@ Import Namespace="System.Net" %>
<%@ Import Namespace="System.IO" %>
<script language="C#" runat="server">
void Page_Load(Object Src, EventArgs E) {

// Process readHtmlPage function
  myPage.Text = readHtmlPage("https://secure.easypaydirectgateway.com/api/transact.php");
}

private String readHtmlPage(string url)
{

//setup some variables

String security_key = "6457Thfj624V5r7WUwc5v6a68Zsd6YEm";
String firstname = "John";
String lastname  = "Smith";
String address1  = "1234 Main St.";
String city      = "Chicago";
String state     = "IL";
String zip       = "60193";

//setup some variables end

  String result = "";
  String strPost = "security_key=" + security_key
     + "&firstname=" + firstname + "&lastname=" + lastname
     + "&address1=" + address1 + "&city=" + city + "&state=" + state
     + "&zip=" + zip + "&payment=creditcard&type=sale"
     + "&amount=1.00&ccnumber=4111111111111111&ccexp=1015&cvv=123";
  StreamWriter myWriter = null;

  HttpWebRequest objRequest = (HttpWebRequest)WebRequest.Create(url);
  objRequest.Method = "POST";
  objRequest.ContentLength = strPost.Length;
  objRequest.ContentType = "application/x-www-form-urlencoded";

  try
  {
     myWriter = new StreamWriter(objRequest.GetRequestStream());
     myWriter.Write(strPost);
  }
  catch (Exception e)
  {
     return e.Message;
  }
  finally {
     myWriter.Close();
  }

  HttpWebResponse objResponse = (HttpWebResponse)objRequest.GetResponse();
  using (StreamReader sr =
     new StreamReader(objResponse.GetResponseStream()) )
  {
     result = sr.ReadToEnd();

     // Close and clean up the StreamReader
     sr.Close();
  }
  return result;
}
</script>
<html>
<body>
<b>The content on this web page is the result of an HTTP POST operation to the Gateway, using the Payment API method.<br>
<br/>
</b><hr/>
<asp:literal id="myPage" runat="server"/>
</body>
</html>
```

# ccon.cfm

```xml

<CFLOCK Name="#session.sessionID#" timeout="10" Type ="Exclusive">
<CFPARAM NAME="session.status" Default="none">
<CFPARAM NAME="emsg" Default="A connection with the financial gateway failed.">
<CFSET oid = ''>
<CFSET em = 0>

<CFIF not IsDefined('URL.ccinterim')>
<CFSET em = 100>
<CFELSEIF not IsDefined('session.store')>
<CFSET em = 101>
<CFELSEIF not session.active>
<CFSET em = 102>
<CFELSEIF not session.store>
<CFSET em = 103>
<CFELSEIF #session.retry# gt 2>
<CFSET em = 400>
</CFIF>
<CFIF em gt 0>
<CFLOCATION URL="../Templates/process_error.cfm?#session.URLtoken#&em=#em#">
</CFIF>

<CFSET start = GetTickCount()>
<CFPARAM NAME="result" DEFAULT="false">
<CFPARAM NAME="com_error" DEFAULT="none">
<CFPARAM NAME="session.redirect" Default="x">
<CFPARAM NAME="session.status" Default="none">
<CFPARAM NAME="theactioncode" Default="">
<CFSET oid = session.ponumber>

<!--- fix date for 4 digits only now 09/09--->
<CFSET ccmonth = SpanExcluding(session.exprdate, '/')>
<CFSET ccyear = Mid(session.exprdate, 4, 2)>
<CFSET session.exprdate = '#ccmonth##ccyear#'>
<!--- the session.cvv value is set to a form default in ccinterim --->

<!--- the session order values come from paydirect and the cc values from ccinterim --->
<!--- Tax(default=0), shipping(default=0), and PO Number provide Level II processing --->
<CFHTTP url="https://secure.easypaydirectgateway.com/api/transact.php"
method="POST" resolveurl="yes" throwonerror="yes"
PATH="d:\html\users\cfxa2\zanaducom\html\Test\CardTech\" FILE="tempfile.txt">
<CFHTTPPARAM type="FORMFIELD" name="security_key" value="#session.TRNSKEY#">
<CFHTTPPARAM type="FORMFIELD" name="type" value="#session.TRNSTYPE#">
<CFHTTPPARAM type="FORMFIELD" name="amount" value="#session.ustotal#">
<CFHTTPPARAM type="FORMFIELD" name="ccnumber" value="#session.ccnumber#">
<CFHTTPPARAM type="FORMFIELD" name="ccexp" value="#session.exprdate#">
<CFHTTPPARAM type="FORMFIELD" name="address1" value="#session.ccaddress#">
<CFHTTPPARAM type="FORMFIELD" name="zip" value="#session.cczip#">
<CFHTTPPARAM type="FORMFIELD" name="orderid" value="#session.ponumber#">
<CFHTTPPARAM type="FORMFIELD" name="cvv" value="#session.cvv#">
<CFHTTPPARAM type="FORMFIELD" name="tax" value="#session.ustax#">
<CFHTTPPARAM type="FORMFIELD" name="shipping" value="#session.usshipping#">
<!---CFHTTPPARAM type="FORMFIELD" name="transactionid" value="#form.transid#"--->
</CFHTTP>
<!---CFSET result = cfhttp.filecontent would be the usual method of getting the
stored reply;  however, when working in a shared server environment with ColdFusion,
the user may not have authorization to access this storage area and instead will
have to specify the full path within their domain for the file storage location
and again specify the path for a file read action. With multiple domains in a
sandbox environment, any of the domains can be used for saving the reply file.  On
each transaction this file gets over written.--->
<CFFILE ACTION="read"
FILE="d:\html\users\cfxa2\zanaducom\html\Test\CardTech\tempfile.txt"
VARIABLE="result">

<CFIF IsDefined('result')>
<!--- create array of names and then loop to populate a query structure
called "crdck".  Map mynames to Island names for standardization. If
this is a first time gateway setup, the mapping will not be necessary.  Simply
parse the names and values.--->
<CFSET mystring = result>
<!--- CFSET mynames = "response,responsetext,authcode,transactionid,avsresponse,cvvresponse,orderid,type" --->
<!--- create arrays from the strings --->
<CFSET myarray = ListToArray(mystring, "&")>
<CFSET islandnames = "ActionCode,Status,AuthNumber,MerchantTransaction,AVSCode,CVVcode,OrderID,Referencecode">
<CFSET islandnamearray = ListToArray(islandnames, ",")>
<!--- create a new array called crdck and then populate it in a loop with the Island
names and the values.  This is done to remain compatible with previous
instances of other gateways without having to change all of the downstream syntax. --->
<CFSET crdck = QueryNew(islandnames)>
<CFSET temp = QueryAddRow(crdck)>
<!--- loop to populate array with desired names (island names) and values --->
<CFLOOP  INDEX="k" FROM="1" TO="#ArrayLen(myarray)#">
<CFSET sz = Len(myarray[k])>
<CFSET m = FindNoCase("=", myarray[k], 1)>
<CFIF m is 0><!--- create dummy value in case the = sign not found --->
<CFSET temp = QuerySetCell(crdck, islandnamearray[k], "xxx")>
<CFELSE>
<CFSET n = Find("=", myarray[k], m+sz)>
<CFSET avalue = Mid(myarray[k], m+1, sz)>
<CFSET temp = QuerySetCell(crdck, islandnamearray[k], avalue)>
</CFIF>
<CFIF #k# gt 20><CFBREAK></CFIF><!--- prevent an endless loop for any reason --->
</CFLOOP>
</CFIF>

<CFIF IsDefined('crdck.Actioncode')>
<CFSET theactioncode = crdck.Actioncode>
<!--- this call will timeout based on server configuration --->

<CFSET thedate = DateFormat(now(), 'mm/dd/yy')>

<!--- some mapping is required because CardTech gateway uses their Responsetext
field, our STATUS field, for both status and error messages. --->

<!--- In our database STATUS is a short advisory to the merchant on the order
summary page.  Their 'response' is our actioncode--->
<CFSET thestatus = crdck.Actioncode>
<CFIF thestatus eq 1>
<CFSET thestatus = 'auth-settle::1'>
<CFELSEIF thestatus eq 2>
<CFSET thestatus = 'retry-auth(credit)::2'>
<CFELSEIF thestatus eq 3>
<CFSET thestatus = 'retry-auth(data)::3'>
<CFELSEIF thestatus eq "">
<CFSET thestatus = 'retry-auth(comm)::'>
</CFIF>

<!--- A short statement for the 'trnsmsg' on the order detail page. CardTech
returns 'success' in their responsetext field when actioncode=1 --->
<CFSET msg = crdck.status>
<CFIF crdck.Actioncode is not 1>
<CFSET msg = 'declined'>
</CFIF>

<!--- CardTech Responsetext(our status) is a message which is mapped to our
error message when 'success' (CardTech actioncode is not equal to 1)is not
returned. The emsg(error message) is for the customer and order detail page. --->
<CFSET emsg = crdck.status>
<CFIF crdck.Actioncode is 1>
<CFSET emsg = 'no-error'>
</CFIF>

<!--- zero lenth not allowed in database table entry --->
<CFSET oid = crdck.OrderID>
<CFIF #Len(oid)# is 0>
<CFSET oid = #session.ponumber#>
</CFIF>

<CFSET avs = crdck.AVSCode>
<CFIF Len(avs) is 0>
<CFSET avs = 'no return'>
</CFIF>

<CFSET cvv = crdck.CVVCode>
<CFIF Len(cvv) is 0>
<CFSET cvv = 'no return'>
</CFIF>

<CFSET authnum = crdck.AuthNumber>
<CFIF Len(authnum) is 0>
<CFSET authnum = 'xxx'>
</CFIF>

<CFSET trnsmsg = '#authnum#::#msg#::#crdck.ActionCode#'>
<CFSET trnsid = '#crdck.MerchantTransaction#::#crdck.ReferenceCode#'>

<CFQUERY NAME="logpayment" DATASOURCE="#application.ordersDSN#">
	UPDATE #session.table#
	SET	TRNSMSG = '#trnsmsg#',<!--- this is RESULT entry on order detail page --->
		STATUS = '#thestatus#',
		AVS = '#avs#',
		TRNSRSV = '#cvv#',
		ERRORMSG = '#emsg#',
		TRANSID = '#trnsid#' <!--- this is Authorize ID on order detail page --->
		WHERE
		PONUMBER = '#oid#'
</CFQUERY>

<CFSET session.retry = session.retry +1>
<CFSET end = GetTickCount()>
<CFSET session.duration = evaluate((end - session.start)/1000)>

<CFIF crdck.Actioncode is 1>
<CFLOCATION URL = "../Templates/cc_good.cfm?#session.URLToken#&ccon=1">

<CFELSEIF crdck.Actioncode is 2>
<CFSET em = 401>
<CFLOCATION URL="../Templates/process_error.cfm?#session.URLToken#&em=#em#&emsg=#emsg#">

<CFELSEIF crdck.ActionCode is 3 AND FindNoCase('expiration', emsg,1) gt 0>
<CFSET em = 402>
<CFLOCATION URL="../Templates/process_error.cfm?#session.URLToken#&em=#em#&emsg=#emsg#">

<CFELSEIF crdck.ActionCode is 3 AND FindNoCase('invalid', emsg,1) gt 0>
<CFSET em = 405>
<CFLOCATION URL="../Templates/process_error.cfm?#session.URLToken#&em=#em#&emsg=#emsg#">

<CFELSEIF crdck.ActionCode is 3>
<CFSET em = 404>
<CFLOCATION URL="../Templates/process_error.cfm?#session.URLToken#&em=#em#&emsg=#emsg#">
</CFIF>
</CFIF><!--- end of crdck.actioncode defined --->

<CFIF theactioncode is ""><!--- from the default value modified by crdck.actioncode --->
<CFSET em = 406>
<CFLOCATION URL="../Templates/process_error.cfm?#session.URLToken#&em=#em#&emsg=""">
</CFIF>
</CFLOCK>
```

# mytest.htm

```html

<DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.0 Transitional//EN" "http://www.w3.org/TR/REC-html40/loose.dtd">
<html><head><title>ColdFusion test</title>
<meta http-equiv="Content-Type" content="text/html; charset=ISO-8859-1">
<meta http-equiv="Expires" content="Mon,23 Sept 1998 00:00:00 GMT">
<meta name='description' content=''>
<meta name='keywords' content=''>
<meta name='author' content='ImagineNation'>
<meta name='url' content='http://www.ImagineNation.com'>
<!--- COPYRIGHT:===============================================
Any commercial use or duplication, in part or in whole, of this
copyright material without prior licensing is forbidden by
federal law.  Violators may be subject to civil and/or criminal
penalties, (Title 17, Sections 501 and 506).
========================================================== --->
<!-- script language="JavaScript1.1" src="whatever.js" type="text/javascript" -->
<script language="JavaScript1.1" type="text/javascript">
//<!-- ==========================Hide SCRIPT=============================
//onError = null
//===============================The End============================= -->
</script>
<style>
body{background-color:#cadaca; margin: 5px 0px 0px 5px;
font-family:verdana; font-size:12pt; font-weight:bold; color:#000000;
}
.toptable{background-color:#daeaca; font-family:Verdana; font-size:10pt;
font-weight:bold; color:#000000; padding:10px; width:350px; height:150px;
border-width:2px; border-color:#b07050; border-style:solid; float:left;
display:inline;
}
.cr{color:#000000; font-family:Ariel; font-size:8pt;
font-weight:normal; font-style:italic;
}
</style>
</head>

<body>
<h4>HTML Test File<br>
Submits to the ColdFusion process.cfm File</h4>
<div class="toptable" align="right">
The names in parenthesis are the processing names which are
populated with values in the form fields.  The security key allows for
test transactions on the gateway.<br>
<form name="testtrans" action="process.cfm" method="post">
security_key:  <input type="text" name="security_key" size=32 value="6457Thfj624V5r7WUwc5v6a68Zsd6YEm"><br>
amount:  <input type="text" name="amount" size=20 value="2.00"><br>
transtype:  <input type="text" name="transtype" size=20 value="auth"><br>
ccnumber:  <input type="text" name="ccnumber" size=20 value="4111111111111111"><br>
ccexp:  <input type="text" name="ccexp" size=20 value="0407"><br>
address1:  <input type="text" name="ccaddress" size=20 value="20 demo lane"><br>
zip:  <input type="text" name="cczip" size=20 value="20123"><br>
cvv:  <input type="text" name="cvv" size=20 value="444"><br>
orderid:  <input type="text" name="orderid" size=20 value="UM12345678"><br>
tax:  <input type="text" name="tax" size=20 value="1.20"><br>
transid:  <input type="text" name="transid" size=20 value=""><br>
<input type="submit" value=" SUBMIT ">
</form><br>
Transid is the transaction ID number returned and the number that must be used
to capture an authorization or make a return.
</div>

<center class="cr">
<p> <p><a href="http://ImagineNation.com" target="_blank">ImagineNation</a><br>© 1996 - 2006
</center>
</body></html>
```

# process.cfm

```xml

<!--- It is advisable to run this file in a managed application with a lock on
the session to avoid interference from some other operation while waiting for
the return information. --->

<CFLOCK Name="testfiles" timeout="10" Type ="Exclusive">
<CFSET begin =GetTickCount()>

<!--- These default values are provided to prevent errors of omission. --->
<CFPARAM NAME="form.security_key" DEFAULT="xx">
<CFPARAM NAME="form.amount" DEFAULT="xx">
<CFPARAM NAME="form.transtype" DEFAULT="xx">
<CFPARAM NAME="form.ccnumber" DEFAULT="xx">
<CFPARAM NAME="form.ccexp" DEFAULT="xx">
<CFPARAM NAME="form.ccaddress" DEFAULT="xx">
<CFPARAM NAME="form.cczip" DEFAULT="xx">
<CFPARAM NAME="form.orderid" DEFAULT="xx">
<CFPARAM NAME="form.ccv" DEFAULT="">
<CFPARAM NAME="form.tax" DEFAULT="0.75">
<CFPARAM NAME="form.transid" DEFAULT="">
<CFPARAM NAME="result" DEFAULT="xx">

<!--- CFSET result = cfhttp.filecontent would be the usual method of getting the
stored reply from a post action without specifying a path;  however, when working
in a shared server environment with ColdFusion, the user may not have authorization
to access this storage area and instead will have to specify the full path within
their own domain for the file storage location and again specify the same path for
a file read action.  With multiple domains in a sandbox environment, any of the
domains can be used for saving the reply file.  On each transaction this file gets
over written.  The example below is specific to ImagineNation and must be changed
for your own testing.--->

<!--- This is the post to the gateway server. --->
<cfhttp url="https://secure.easypaydirectgateway.com/api/transact.php"
method="POST" resolveurl="yes" throwonerror="yes"
PATH="d:\html\users\cfxa2\zanaducom\html\Test\CardTech\" FILE="tempfile.txt">
<cfhttpparam type="FORMFIELD" name="security_key" value="#form.security_key#">
<cfhttpparam type="FORMFIELD" name="amount" value="#form.Amount#">
<cfhttpparam type="FORMFIELD" name="type" value="#form.transtype#">
<cfhttpparam type="FORMFIELD" name="ccnumber" value="#form.CCNumber#">
<cfhttpparam type="FORMFIELD" name="ccexp" value="#form.CCExp#">
<cfhttpparam type="FORMFIELD" name="address1" value="#form.ccaddress#">
<cfhttpparam type="FORMFIELD" name="zip" value="#form.cczip#">
<cfhttpparam type="FORMFIELD" name="orderid" value="#form.orderid#">
<cfhttpparam type="FORMFIELD" name="cvv" value="#form.cvv#">
<cfhttpparam type="FORMFIELD" name="tax" value="#form.tax#">
<cfhttpparam type="FORMFIELD" name="transactionid" value="#form.transid#">
</CFHTTP>

<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.0 Transitional//EN" "http://www.w3.org/TR/REC-html40/loose.dtd">
<html><head><title>ImagineNation: ColdFusion process</title>
<style>
body{background-color:#cadaca; margin: 5px 0px 0px 5px;
font-family:verdana; font-size:12pt; font-weight:bold; color:#000000;
}
.toptable{background-color:#daeaca; font-family:Verdana; font-size:10pt;
font-weight:bold; color:#000000; padding:10px; width:350px; height:150px;
border-width:2px; border-color:#b07050; border-style:solid; float:left;
display:inline;
}
.cr{color:#000000; font-family:Ariel; font-size:8pt;
font-weight:normal; font-style:italic;
}
</style>
</head>

<body>
<h4>Transaction results appear here.</h4>
<CFFILE ACTION="read"
FILE="d:\html\users\cfxa2\zanaducom\html\Test\CardTech\tempfile.txt"
VARIABLE="result">
<CFOUTPUT>
<CFIF IsDefined('result')>
<b>The returned string is:<br>
<font size="-1">#result#</font></b>
<CFELSE>
<b>
No return found</b>
</CFIF>
<div class="toptable">
The string can be converted to an array of name/value pairs by splitting on the "&" sign.<br><br>
<CFSET responsearray = ListToArray(result, "&")>
The array length is #ArrayLen(responsearray)#
<br><br>
The returned array values are:<br><br>
<CFLOOP INDEX="k" FROM="1" TO="#ArrayLen(responsearray)#">
#responsearray[k]#<br>
<CFIF #k# gt 20><CFBREAK></CFIF><!--- prevent an endless loop for any reason --->
</CFLOOP>
</CFOUTPUT><br><br>
If this was a type=auth transaction, you can return to the <a href="mytest.htm">
form page</a> and enter the transaction id and change type to capture to test
the capture mode.
</div>

<CFOUTPUT>
<p><CFSET end =GetTickCount()>
process duration = #Evaluate((end-begin)/1000)# seconds
</CFOUTPUT>
</CFLOCK>

<center class="cr">
<p> <p><a href="http://ImagineNation.com" target="_blank">ImagineNation</a><br>© 1996 - 2006
</center>
</body></html>
```

```java

import java.util.*;
import java.io.*;
import java.net.*;
import java.security.*;
import java.text.*;

import javax.net.ssl.HostnameVerifier;
import javax.net.ssl.HttpsURLConnection;
import javax.net.ssl.SSLSession;

class PaymentGateway {

  protected String server;
  protected String port;
  protected String path;
  protected String security_key;

  public PaymentGateway(String key)
  {

    server = "secure.easypaydirectgateway.com";
    port = "443";
    path = "https://secure.easypaydirectgateway.com/api/transact.php";
    security_key = key;

  }

  public HashMap doSale( double amount,
                           String ccNumber,
                           String ccExp
                           ) throws Exception
  {
      HashMap result = new HashMap();
      HashMap request = new HashMap();

      DecimalFormat form = new DecimalFormat("#.00");

      request.put("amount", form.format(amount));
      request.put("type", "sale");
      request.put("ccnumber", ccNumber);
      request.put("ccexp", ccExp);

      String data_out = prepareRequest(request);

      String error = "";
      String data_in = "";
      boolean success = true;
      try {
          HashMap retval = postForm(data_out);
          data_in = (String)retval.get("response");
          result.put("transactionid", retval.get("transactionid"));
      } catch (IOException e) {
          success = false;
          error = "Connect error, " + e.getMessage();
      } catch (Exception e) {
          success = false;
          error = e.getMessage();
      }
      if (!success) {
          throw new Exception(error);
      }

      return result;
  }

  // Utility Functions

  public String prepareRequest(HashMap request) {

      if (request.size() == 0) {
         return "";
      }

      request.put("security_key", security_key);

      Set s = request.keySet();
      Iterator i = s.iterator();
      Object key = i.next();
      StringBuffer buffer = new StringBuffer();

      buffer.append(key).append("=")
            .append(URLEncoder.encode((String) request.get(key)));

      while (i.hasNext()) {
          key = i.next();
          buffer.append("&").append(key).append("=")
                .append(URLEncoder.encode((String) request.get(key)));
      }

      return buffer.toString();

  }

  protected HashMap postForm(String data) throws Exception {

     HashMap result = new HashMap();

     HttpURLConnection postConn;

     HostnameVerifier hv = new HostnameVerifier() {
        public boolean verify(String urlHostName, SSLSession session) {
            return true;
        }
     };

     HttpsURLConnection.setDefaultHostnameVerifier(hv);

     URL post = new URL("https", server, Integer.parseInt(port), path);
     postConn = (HttpURLConnection)post.openConnection();

     postConn.setRequestMethod("POST");
     postConn.setDoOutput(true);

     PrintWriter out = new PrintWriter(postConn.getOutputStream());
     out.print(data);
     out.close();

     BufferedReader in =
        new BufferedReader(new InputStreamReader(postConn.getInputStream()));

     String inputLine;
     StringBuffer buffer = new StringBuffer();
     while ((inputLine = in.readLine()) != null) {
        buffer.append(inputLine);
     }
     in.close();

     String response = buffer.toString();

     result.put("response", response);

     // Parse Result
     StringTokenizer st = new StringTokenizer(response, "&");
     while (st.hasMoreTokens()) {
        String varString = st.nextToken();
        StringTokenizer varSt = new StringTokenizer(varString, "=");
        if (varSt.countTokens() > 2 || varSt.countTokens()<1) {
            throw new Exception("Bad variable from processor center: " + varString);
        }
        if (varSt.countTokens()==1) {
            result.put(varSt.nextToken(), "");
        } else {
            result.put(varSt.nextToken(), varSt.nextToken());
        }
     }

     if (result.get("response")=="") {
        throw new Exception("Bad response from processor center" + response);
     }

     if (!result.get("response").toString().equals("1")) {
        throw new Exception(result.get("responsetext").toString());
     }

     return result;
  }

}

public class TestPaymentGateway
{
    public static void main(String arg[])
    {
        HashMap retval = new HashMap();
        PaymentGateway gw = new PaymentGateway("6457Thfj624V5r7WUwc5v6a68Zsd6YEm");

        try {
            retval = gw.doSale(10.05, "4111111111111111", "0909");
            System.out.println("Success\nTransId: " + retval.get("transactionid") + "\n");
        } catch (Exception e) {
            System.out.println("Error: " + e.getMessage());
        }

    }
}
```

```javascript

const https = require('https');
const querystring = require('querystring');

class DirectPost {
  constructor(security_key) {
    this.security_key = security_key;
  }

  setBilling(billingInformation) {
    // Validate that passed in information contains valid keys
    const validBillingKeys = ['first_name', 'last_name', 'company', 'address1',\
        'address2', 'city', 'state', 'zip', 'country', 'phone', 'fax', 'email'];

    for (let key in billingInformation) {
      if (!validBillingKeys.includes(key)) {
        throw new Error(`Invalid key provided in billingInformation. '${key}'
            is not a valid billing parameter.`)
      }
    };

    this.billing = billingInformation;
  }

  setShipping(shippingInformation) {
    // Validate that passed in information contains valid keys
    const validShippingKeys = [\
      'shipping_first_name', 'shipping_last_name', 'shipping_company',\
      'shipping_address1', 'address2', 'shipping_city', 'shipping_state',\
      'shipping_zip', 'shipping_country', 'shipping_email'\
    ];

    for (let key in shippingInformation) {
      if (!validShippingKeys.includes(key)) {
        throw new Error(`Invalid key provided in shippingInformation. '${key}'
            is not a valid shipping parameter.`)
      }
    };

    this.shipping = shippingInformation;
  }

  doSale(amount, ccNum, ccExp, cvv) {
    let requestOptions = {
      'type': 'sale',
      'amount': amount,
      'ccnumber': ccNum,
      'ccexp': ccExp,
      'cvv': cvv
    };

    // Merge together all request options into one object
    Object.assign(requestOptions, this.billing, this.shipping);

    // Make request
    this._doRequest(requestOptions);
  }

  _doRequest(postData) {
    const hostName = 'secure.easypaydirectgateway.com';
    const path = '/api/transact.php';

    postData.security_key = this.security_key;
    postData = querystring.stringify(postData);

    const options = {
      hostname: hostName,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    // Make request to Payment API
    const req = https.request(options, (response) => {
      console.log(`STATUS: ${response.statusCode}`);
      console.log(`HEADERS: ${JSON.stringify(response.headers)}`);

      response.on('data', (chunk) => {
        console.log(`BODY: ${chunk}`);
      });
      response.on('end', () => {
        console.log('No more data in response.');
      });
    });

    req.on('error', (e) => {
      console.error(`Problem with request: ${e.message}`);
    });

    // Write post data to request body
    req.write(postData);
    req.end();
  }
}

const dp = new DirectPost('{security_key}');
const billingInfo = {
  'first_name': 'Test',
  'last_name': 'User',
  'address1': '123 Main St',
  'city': 'New York',
  'state': 'NY',
  'zip' : '12345',
}
const shippingInfo = {
  'shipping_first_name': 'User',
  'shipping_last_name': 'Test',
  'shipping_address1': '987 State St',
  'shipping_city': 'Los Angeles',
  'shipping_state': 'CA',
  'shipping_zip' : '98765',
}

dp.setBilling(billingInfo);
dp.setShipping(shippingInfo);
// Set dummy data for sale
dp.doSale('100.00', '4111111111111111', '1221', '123');


```

```php

define("APPROVED", 1);
define("DECLINED", 2);
define("ERROR", 3);

class gwapi {

// Initial Setting Functions

  function setLogin($security_key) {
    $this->login['security_key'] = $security_key;
  }

  function setOrder($orderid,
        $orderdescription,
        $tax,
        $shipping,
        $ponumber,
        $ipaddress) {
    $this->order['orderid']          = $orderid;
    $this->order['orderdescription'] = $orderdescription;
    $this->order['tax']              = $tax;
    $this->order['shipping']         = $shipping;
    $this->order['ponumber']         = $ponumber;
    $this->order['ipaddress']        = $ipaddress;
  }

  function setBilling($firstname,
        $lastname,
        $company,
        $address1,
        $address2,
        $city,
        $state,
        $zip,
        $country,
        $phone,
        $fax,
        $email,
        $website) {
    $this->billing['firstname'] = $firstname;
    $this->billing['lastname']  = $lastname;
    $this->billing['company']   = $company;
    $this->billing['address1']  = $address1;
    $this->billing['address2']  = $address2;
    $this->billing['city']      = $city;
    $this->billing['state']     = $state;
    $this->billing['zip']       = $zip;
    $this->billing['country']   = $country;
    $this->billing['phone']     = $phone;
    $this->billing['fax']       = $fax;
    $this->billing['email']     = $email;
    $this->billing['website']   = $website;
  }

  function setShipping($firstname,
        $lastname,
        $company,
        $address1,
        $address2,
        $city,
        $state,
        $zip,
        $country,
        $email) {
    $this->shipping['firstname'] = $firstname;
    $this->shipping['lastname']  = $lastname;
    $this->shipping['company']   = $company;
    $this->shipping['address1']  = $address1;
    $this->shipping['address2']  = $address2;
    $this->shipping['city']      = $city;
    $this->shipping['state']     = $state;
    $this->shipping['zip']       = $zip;
    $this->shipping['country']   = $country;
    $this->shipping['email']     = $email;
  }

  // Transaction Functions

  function doSale($amount, $ccnumber, $ccexp, $cvv="") {

    $query  = "";
    // Login Information
    $query .= "security_key=" . urlencode($this->login['security_key']) . "&";
    // Sales Information
    $query .= "ccnumber=" . urlencode($ccnumber) . "&";
    $query .= "ccexp=" . urlencode($ccexp) . "&";
    $query .= "amount=" . urlencode(number_format($amount,2,".","")) . "&";
    $query .= "cvv=" . urlencode($cvv) . "&";
    // Order Information
    $query .= "ipaddress=" . urlencode($this->order['ipaddress']) . "&";
    $query .= "orderid=" . urlencode($this->order['orderid']) . "&";
    $query .= "orderdescription=" . urlencode($this->order['orderdescription']) . "&";
    $query .= "tax=" . urlencode(number_format($this->order['tax'],2,".","")) . "&";
    $query .= "shipping=" . urlencode(number_format($this->order['shipping'],2,".","")) . "&";
    $query .= "ponumber=" . urlencode($this->order['ponumber']) . "&";
    // Billing Information
    $query .= "firstname=" . urlencode($this->billing['firstname']) . "&";
    $query .= "lastname=" . urlencode($this->billing['lastname']) . "&";
    $query .= "company=" . urlencode($this->billing['company']) . "&";
    $query .= "address1=" . urlencode($this->billing['address1']) . "&";
    $query .= "address2=" . urlencode($this->billing['address2']) . "&";
    $query .= "city=" . urlencode($this->billing['city']) . "&";
    $query .= "state=" . urlencode($this->billing['state']) . "&";
    $query .= "zip=" . urlencode($this->billing['zip']) . "&";
    $query .= "country=" . urlencode($this->billing['country']) . "&";
    $query .= "phone=" . urlencode($this->billing['phone']) . "&";
    $query .= "fax=" . urlencode($this->billing['fax']) . "&";
    $query .= "email=" . urlencode($this->billing['email']) . "&";
    $query .= "website=" . urlencode($this->billing['website']) . "&";
    // Shipping Information
    $query .= "shipping_firstname=" . urlencode($this->shipping['firstname']) . "&";
    $query .= "shipping_lastname=" . urlencode($this->shipping['lastname']) . "&";
    $query .= "shipping_company=" . urlencode($this->shipping['company']) . "&";
    $query .= "shipping_address1=" . urlencode($this->shipping['address1']) . "&";
    $query .= "shipping_address2=" . urlencode($this->shipping['address2']) . "&";
    $query .= "shipping_city=" . urlencode($this->shipping['city']) . "&";
    $query .= "shipping_state=" . urlencode($this->shipping['state']) . "&";
    $query .= "shipping_zip=" . urlencode($this->shipping['zip']) . "&";
    $query .= "shipping_country=" . urlencode($this->shipping['country']) . "&";
    $query .= "shipping_email=" . urlencode($this->shipping['email']) . "&";
    $query .= "type=sale";
    return $this->_doPost($query);
  }

  function doAuth($amount, $ccnumber, $ccexp, $cvv="") {

    $query  = "";
    // Login Information
    $query .= "security_key=" . urlencode($this->login['security_key']) . "&";
    // Sales Information
    $query .= "ccnumber=" . urlencode($ccnumber) . "&";
    $query .= "ccexp=" . urlencode($ccexp) . "&";
    $query .= "amount=" . urlencode(number_format($amount,2,".","")) . "&";
    $query .= "cvv=" . urlencode($cvv) . "&";
    // Order Information
    $query .= "ipaddress=" . urlencode($this->order['ipaddress']) . "&";
    $query .= "orderid=" . urlencode($this->order['orderid']) . "&";
    $query .= "orderdescription=" . urlencode($this->order['orderdescription']) . "&";
    $query .= "tax=" . urlencode(number_format($this->order['tax'],2,".","")) . "&";
    $query .= "shipping=" . urlencode(number_format($this->order['shipping'],2,".","")) . "&";
    $query .= "ponumber=" . urlencode($this->order['ponumber']) . "&";
    // Billing Information
    $query .= "firstname=" . urlencode($this->billing['firstname']) . "&";
    $query .= "lastname=" . urlencode($this->billing['lastname']) . "&";
    $query .= "company=" . urlencode($this->billing['company']) . "&";
    $query .= "address1=" . urlencode($this->billing['address1']) . "&";
    $query .= "address2=" . urlencode($this->billing['address2']) . "&";
    $query .= "city=" . urlencode($this->billing['city']) . "&";
    $query .= "state=" . urlencode($this->billing['state']) . "&";
    $query .= "zip=" . urlencode($this->billing['zip']) . "&";
    $query .= "country=" . urlencode($this->billing['country']) . "&";
    $query .= "phone=" . urlencode($this->billing['phone']) . "&";
    $query .= "fax=" . urlencode($this->billing['fax']) . "&";
    $query .= "email=" . urlencode($this->billing['email']) . "&";
    $query .= "website=" . urlencode($this->billing['website']) . "&";
    // Shipping Information
    $query .= "shipping_firstname=" . urlencode($this->shipping['firstname']) . "&";
    $query .= "shipping_lastname=" . urlencode($this->shipping['lastname']) . "&";
    $query .= "shipping_company=" . urlencode($this->shipping['company']) . "&";
    $query .= "shipping_address1=" . urlencode($this->shipping['address1']) . "&";
    $query .= "shipping_address2=" . urlencode($this->shipping['address2']) . "&";
    $query .= "shipping_city=" . urlencode($this->shipping['city']) . "&";
    $query .= "shipping_state=" . urlencode($this->shipping['state']) . "&";
    $query .= "shipping_zip=" . urlencode($this->shipping['zip']) . "&";
    $query .= "shipping_country=" . urlencode($this->shipping['country']) . "&";
    $query .= "shipping_email=" . urlencode($this->shipping['email']) . "&";
    $query .= "type=auth";
    return $this->_doPost($query);
  }

  function doCredit($amount, $ccnumber, $ccexp) {

    $query  = "";
    // Login Information
    $query .= "security_key=" . urlencode($this->login['security_key']) . "&";
    // Sales Information
    $query .= "ccnumber=" . urlencode($ccnumber) . "&";
    $query .= "ccexp=" . urlencode($ccexp) . "&";
    $query .= "amount=" . urlencode(number_format($amount,2,".","")) . "&";
    // Order Information
    $query .= "ipaddress=" . urlencode($this->order['ipaddress']) . "&";
    $query .= "orderid=" . urlencode($this->order['orderid']) . "&";
    $query .= "orderdescription=" . urlencode($this->order['orderdescription']) . "&";
    $query .= "tax=" . urlencode(number_format($this->order['tax'],2,".","")) . "&";
    $query .= "shipping=" . urlencode(number_format($this->order['shipping'],2,".","")) . "&";
    $query .= "ponumber=" . urlencode($this->order['ponumber']) . "&";
    // Billing Information
    $query .= "firstname=" . urlencode($this->billing['firstname']) . "&";
    $query .= "lastname=" . urlencode($this->billing['lastname']) . "&";
    $query .= "company=" . urlencode($this->billing['company']) . "&";
    $query .= "address1=" . urlencode($this->billing['address1']) . "&";
    $query .= "address2=" . urlencode($this->billing['address2']) . "&";
    $query .= "city=" . urlencode($this->billing['city']) . "&";
    $query .= "state=" . urlencode($this->billing['state']) . "&";
    $query .= "zip=" . urlencode($this->billing['zip']) . "&";
    $query .= "country=" . urlencode($this->billing['country']) . "&";
    $query .= "phone=" . urlencode($this->billing['phone']) . "&";
    $query .= "fax=" . urlencode($this->billing['fax']) . "&";
    $query .= "email=" . urlencode($this->billing['email']) . "&";
    $query .= "website=" . urlencode($this->billing['website']) . "&";
    $query .= "type=credit";
    return $this->_doPost($query);
  }

  function doOffline($authorizationcode, $amount, $ccnumber, $ccexp) {

    $query  = "";
    // Login Information
    $query .= "security_key=" . urlencode($this->login['security_key']) . "&";
    // Sales Information
    $query .= "ccnumber=" . urlencode($ccnumber) . "&";
    $query .= "ccexp=" . urlencode($ccexp) . "&";
    $query .= "amount=" . urlencode(number_format($amount,2,".","")) . "&";
    $query .= "authorizationcode=" . urlencode($authorizationcode) . "&";
    // Order Information
    $query .= "ipaddress=" . urlencode($this->order['ipaddress']) . "&";
    $query .= "orderid=" . urlencode($this->order['orderid']) . "&";
    $query .= "orderdescription=" . urlencode($this->order['orderdescription']) . "&";
    $query .= "tax=" . urlencode(number_format($this->order['tax'],2,".","")) . "&";
    $query .= "shipping=" . urlencode(number_format($this->order['shipping'],2,".","")) . "&";
    $query .= "ponumber=" . urlencode($this->order['ponumber']) . "&";
    // Billing Information
    $query .= "firstname=" . urlencode($this->billing['firstname']) . "&";
    $query .= "lastname=" . urlencode($this->billing['lastname']) . "&";
    $query .= "company=" . urlencode($this->billing['company']) . "&";
    $query .= "address1=" . urlencode($this->billing['address1']) . "&";
    $query .= "address2=" . urlencode($this->billing['address2']) . "&";
    $query .= "city=" . urlencode($this->billing['city']) . "&";
    $query .= "state=" . urlencode($this->billing['state']) . "&";
    $query .= "zip=" . urlencode($this->billing['zip']) . "&";
    $query .= "country=" . urlencode($this->billing['country']) . "&";
    $query .= "phone=" . urlencode($this->billing['phone']) . "&";
    $query .= "fax=" . urlencode($this->billing['fax']) . "&";
    $query .= "email=" . urlencode($this->billing['email']) . "&";
    $query .= "website=" . urlencode($this->billing['website']) . "&";
    // Shipping Information
    $query .= "shipping_firstname=" . urlencode($this->shipping['firstname']) . "&";
    $query .= "shipping_lastname=" . urlencode($this->shipping['lastname']) . "&";
    $query .= "shipping_company=" . urlencode($this->shipping['company']) . "&";
    $query .= "shipping_address1=" . urlencode($this->shipping['address1']) . "&";
    $query .= "shipping_address2=" . urlencode($this->shipping['address2']) . "&";
    $query .= "shipping_city=" . urlencode($this->shipping['city']) . "&";
    $query .= "shipping_state=" . urlencode($this->shipping['state']) . "&";
    $query .= "shipping_zip=" . urlencode($this->shipping['zip']) . "&";
    $query .= "shipping_country=" . urlencode($this->shipping['country']) . "&";
    $query .= "shipping_email=" . urlencode($this->shipping['email']) . "&";
    $query .= "type=offline";
    return $this->_doPost($query);
  }

  function doCapture($transactionid, $amount =0) {

    $query  = "";
    // Login Information
    $query .= "security_key=" . urlencode($this->login['security_key']) . "&";
    // Transaction Information
    $query .= "transactionid=" . urlencode($transactionid) . "&";
    if ($amount>0) {
        $query .= "amount=" . urlencode(number_format($amount,2,".","")) . "&";
    }
    $query .= "type=capture";
    return $this->_doPost($query);
  }

  function doVoid($transactionid) {

    $query  = "";
    // Login Information
    $query .= "security_key=" . urlencode($this->login['security_key']) . "&";
    // Transaction Information
    $query .= "transactionid=" . urlencode($transactionid) . "&";
    $query .= "type=void";
    return $this->_doPost($query);
  }

  function doRefund($transactionid, $amount = 0) {

    $query  = "";
    // Login Information
    $query .= "security_key=" . urlencode($this->login['security_key']) . "&";
    // Transaction Information
    $query .= "transactionid=" . urlencode($transactionid) . "&";
    if ($amount>0) {
        $query .= "amount=" . urlencode(number_format($amount,2,".","")) . "&";
    }
    $query .= "type=refund";
    return $this->_doPost($query);
  }

  function _doPost($query) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, "https://secure.easypaydirectgateway.com/api/transact.php");
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 30);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_HEADER, 0);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0);

    curl_setopt($ch, CURLOPT_POSTFIELDS, $query);
    curl_setopt($ch, CURLOPT_POST, 1);

    if (!($data = curl_exec($ch))) {
        return ERROR;
    }
    curl_close($ch);
    unset($ch);
    print "\n$data\n";
    $data = explode("&",$data);
    for($i=0;$i<count($data);$i++) {
        $rdata = explode("=",$data[$i]);
        $this->responses[$rdata[0]] = $rdata[1];
    }
    return $this->responses['response'];
  }
}

$gw = new gwapi;
$gw->setLogin("6457Thfj624V5r7WUwc5v6a68Zsd6YEm");
$gw->setBilling("John","Smith","Acme, Inc.","123 Main St","Suite 200", "Beverly Hills",
        "CA","90210","US","555-555-5555","555-555-5556","support@example.com",
        "www.example.com");
$gw->setShipping("Mary","Smith","na","124 Shipping Main St","Suite Ship", "Beverly Hills",
        "CA","90210","US","support@example.com");
$gw->setOrder("1234","Big Order",1, 2, "PO1234","65.192.14.10");

$r = $gw->doSale("50.00","4111111111111111","1010");
print $gw->responses['responsetext'];

```

```python

###########################################################
#                                                         #
#  D I S C L A I M E R                                    #
#                                                         #
#  WARNING: ANY USE BY YOU OF THE SAMPLE CODE PROVIDED    #
#  IS AT YOUR OWN RISK.                                   #
#                                                         #
#  The code is  provided  "as is" without                 #
#  warranty of any kind, either express or implied,       #
#  including but not limited to the implied warranties    #
#  of merchantability and/or fitness for a particular     #
#  purpose.                                               #
#                                                         #
#                                                         #
###########################################################

import pycurl
import urllib
import urlparse
import StringIO

class gwapi():

    def __init__(self):
        self.login= dict()
        self.order = dict()
        self.billing = dict()
        self.shipping = dict()
        self.responses = dict()

    def setLogin(self,security_key):
        self.login['security_key'] = security_key

    def setOrder(self, orderid, orderdescription, tax, shipping, ponumber,ipadress):
        self.order['orderid'] = orderid;
        self.order['orderdescription'] = orderdescription
        self.order['shipping'] = '{0:.2f}'.format(float(shipping))
        self.order['ipaddress'] = ipadress
        self.order['tax'] = '{0:.2f}'.format(float(tax))
        self.order['ponumber'] = ponumber

    def setBilling(self,
            firstname,
            lastname,
            company,
            address1,
            address2,
            city,
            state,
            zip,
            country,
            phone,
            fax,
            email,
            website):
        self.billing['firstname'] = firstname
        self.billing['lastname']  = lastname
        self.billing['company']   = company
        self.billing['address1']  = address1
        self.billing['address2']  = address2
        self.billing['city']      = city
        self.billing['state']     = state
        self.billing['zip']       = zip
        self.billing['country']   = country
        self.billing['phone']     = phone
        self.billing['fax']       = fax
        self.billing['email']     = email
        self.billing['website']   = website

    def setShipping(self,firstname,
            lastname,
            company,
            address1,
            address2,
            city,
            state,
            zipcode,
            country,
            email):
        self.shipping['firstname'] = firstname
        self.shipping['lastname']  = lastname
        self.shipping['company']   = company
        self.shipping['address1']  = address1
        self.shipping['address2']  = address2
        self.shipping['city']      = city
        self.shipping['state']     = state
        self.shipping['zip']       = zipcode
        self.shipping['country']   = country
        self.shipping['email']     = email

    def doSale(self,amount, ccnumber, ccexp, cvv=''):

        query  = ""
        # Login Information

        query = query + "security_key=" + urllib.quote(self.login['security_key']) + "&"
        # Sales Information
        query += "ccnumber=" + urllib.quote(ccnumber) + "&"
        query += "ccexp=" + urllib.quote(ccexp) + "&"
        query += "amount=" + urllib.quote('{0:.2f}'.format(float(amount))) + "&"
        if (cvv!=''):
            query += "cvv=" + urllib.quote(cvv) + "&"
        # Order Information
        for key,value in self.order.iteritems():
            query += key +"=" + urllib.quote(str(value)) + "&"

        # Billing Information
        for key,value in self.billing.iteritems():
            query += key +"=" + urllib.quote(str(value)) + "&"

        # Shipping Information
        for key,value in self.shipping.iteritems():
            query += key +"=" + urllib.quote(str(value)) + "&"

        query += "type=sale"
        return self.doPost(query)

    def doPost(self,query):
        responseIO = StringIO.StringIO()
        curlObj = pycurl.Curl()
        curlObj.setopt(pycurl.POST,1)
        curlObj.setopt(pycurl.CONNECTTIMEOUT,30)
        curlObj.setopt(pycurl.TIMEOUT,30)
        curlObj.setopt(pycurl.HEADER,0)
        curlObj.setopt(pycurl.SSL_VERIFYPEER,0)
        curlObj.setopt(pycurl.WRITEFUNCTION,responseIO.write);

        curlObj.setopt(pycurl.URL,"https://secure.easypaydirectgateway.com/api/transact.php")

        curlObj.setopt(pycurl.POSTFIELDS,query)

        curlObj.perform()

        data = responseIO.getvalue()
        temp = urlparse.parse_qs(data)
        for key,value in temp.iteritems():
            self.responses[key] = value[0]
        return self.responses['response']

# NOTE: your security_key should replace the one below
gw = gwapi()
gw.setLogin("6457Thfj624V5r7WUwc5v6a68Zsd6YEm");

gw.setBilling("John","Smith","Acme, Inc.","123 Main St","Suite 200", "Beverly Hills",
        "CA","90210","US","555-555-5555","555-555-5556","support@example.com",
        "www.example.com")
gw.setShipping("Mary","Smith","na","124 Shipping Main St","Suite Ship", "Beverly Hills",
        "CA","90210","US","support@example.com")
gw.setOrder("1234","Big Order",1, 2, "PO1234","65.192.14.10")

r = gw.doSale("5.00","4111111111111111","1212",'999')
print gw.responses['response']

if (int(gw.responses['response']) == 1) :
    print "Approved"
elif (int(gw.responses['response']) == 2) :
    print "Declined"
elif (int(gw.responses['response']) == 3) :
    print "Error"
```

```ruby

###########################################################
#                                                         #
#  D I S C L A I M E R                                    #
#                                                         #
#  WARNING: ANY USE BY YOU OF THE SAMPLE CODE PROVIDED    #
#  IS AT YOUR OWN RISK.                                   #
#                                                         #
#  The code is  provided  "as is" without                 #
#  warranty of any kind, either express or implied,       #
#  including but not limited to the implied warranties    #
#  of merchantability and/or fitness for a particular     #
#  purpose.                                               #
#                                                         #
#                                                         #
###########################################################

require 'rubygems'
require 'curb'
require 'uri'
require 'addressable/uri'

class GwApi

    def initialize()
        @login = {}
        @order = {}
        @billing = {}
        @shipping = {}
        @responses = {}
    end

    def setLogin(security_key)
        @login['security_key'] = security_key
    end

    def setOrder( orderid, orderdescription, tax, shipping, ponumber,ipadress)
        @order['orderid'] = orderid;
        @order['orderdescription'] = orderdescription
        @order['shipping'] = "%.2f" % shipping
        @order['ipaddress'] = ipadress
        @order['tax'] = "%.2f" % tax
        @order['ponumber'] = ponumber
    end

    def setBilling(
            firstname,
            lastname,
            company,
            address1,
            address2,
            city,
            state,
            zip,
            country,
            phone,
            fax,
            email,
            website)
        @billing['firstname'] = firstname
        @billing['lastname']  = lastname
        @billing['company']   = company
        @billing['address1']  = address1
        @billing['address2']  = address2
        @billing['city']      = city
        @billing['state']     = state
        @billing['zip']       = zip
        @billing['country']   = country
        @billing['phone']     = phone
        @billing['fax']       = fax
        @billing['email']     = email
        @billing['website']   = website
    end

    def setShipping(firstname,
            lastname,
            company,
            address1,
            address2,
            city,
            state,
            zipcode,
            country,
            email)
        @shipping['firstname'] = firstname
        @shipping['lastname']  = lastname
        @shipping['company']   = company
        @shipping['address1']  = address1
        @shipping['address2']  = address2
        @shipping['city']      = city
        @shipping['state']     = state
        @shipping['zip']       = zipcode
        @shipping['country']   = country
        @shipping['email']     = email

    end

    def doSale(amount, ccnumber, ccexp, cvv='')

        query  = ""
        # Login Information

        query = query + "security_key=" + URI.escape(@login['security_key']) + "&"
        # Sales Information
        query += "ccnumber=" + URI.escape(ccnumber) + "&"
        query += "ccexp=" + URI.escape(ccexp) + "&"
        query += "amount=" + URI.escape("%.2f" %amount) + "&"
        if (cvv!='')
            query += "cvv=" + URI.escape(cvv) + "&"
        end

        # Order Information
        @order.each do | key,value|
            query += key +"=" + URI.escape(value) + "&"
        end

        # Billing Information
        @billing.each do | key,value|
            query += key +"=" + URI.escape(value) + "&"
        end
        # Shipping Information

        @shipping.each do | key,value|
            query += key +"=" + URI.escape(value) + "&"
        end

        query += "type=sale"
        return doPost(query)
    end

    def doPost(query)

        curlObj = Curl::Easy.new("https://secure.easypaydirectgateway.com/api/transact.php")
        curlObj.connect_timeout = 30
        curlObj.timeout = 30
        curlObj.header_in_body = false
        curlObj.ssl_verify_peer=false
        curlObj.post_body = query
        curlObj.perform()
        data = curlObj.body_str

        # NOTE: The domain name below is simply used to create a full URI to allow URI.parse to parse out the query values
        # for us. It is not used to send any data
        data = '"https://secure.easypaydirectgateway.com/api/transact.php?' + data
        uri = Addressable::URI.parse(data)
        @responses = uri.query_values
        return @responses['response']
    end

    def getResponses()
        return @responses
    end
end

gw = GwApi.new()
# NOTE: your security_key should replace the one below
gw.setLogin("6457Thfj624V5r7WUwc5v6a68Zsd6YEm");

gw.setBilling("John","Smith","Acme, Inc.","123 Main St","Suite 200", "Beverly Hills",
        "CA","90210","US","555-555-5555","555-555-5556","support@example.com",
        "www.example.com")

gw.setShipping("Mary","Smith","na","124 Shipping Main St","Suite Ship", "Beverly Hills",
        "CA","90210","US","support@example.com")

gw.setOrder("1234","Big Order",1, 2, "PO1234","65.192.14.10")

r = gw.doSale("5.00","4111111111111111","1212",'999')
myResponses = gw.getResponses

print myResponses['response'] + "  "

if (myResponses['response'] == '1')
    print "Approved \n"
elsif (myResponses['response'] == '2')
    print "Declined \n"
elsif (myResponses['response'] == '3')
    print "Error \n"
end
```

```php
function testXmlQuery($security_key,$constraints)
{
    // transactionFields has all of the fields we want to validate
    // in the transaction tag in the XML output
    $transactionFields = array(
        'transaction_id',
        'partial_payment_id',
        'partial_payment_balance',
        'platform_id',
        'transaction_type',
        'condition',
        'order_id',
        'authorization_code',
        'ponumber',
        'order_description',

        'first_name',
        'last_name',
        'address_1',
        'address_2',
        'company',
        'city',
        'state',
        'postal_code',
        'country',
        'email',
        'phone',
        'fax',
        'cell_phone',
        'customertaxid',
        'customerid',
        'website',

        'shipping_first_name',
        'shipping_last_name',
        'shipping_address_1',
        'shipping_address_2',
        'shipping_company',
        'shipping_city',
        'shipping_state',
        'shipping_postal_code',
        'shipping_country',
        'shipping_email',
        'shipping_carrier',
        'tracking_number',
        'shipping_date',
        'shipping',
        'shipping_phone',

        'cc_number',
        'cc_hash',
        'cc_exp',
        'cavv',
        'cavv_result',
        'xid',
        'eci',
        'avs_response',
        'csc_response',
        'cardholder_auth',
        'cc_start_date',
        'cc_issue_number',
        'check_account',
        'check_hash',
        'check_aba',
        'check_name',
        'account_holder_type',
        'account_type',
        'sec_code',
        'drivers_license_number',
        'drivers_license_state',
        'drivers_license_dob',
        'social_security_number',

        'processor_id',
        'tax',
        'currency',
        'surcharge',
        'tip',

        'card_balance',
        'card_available_balance',
        'entry_mode',
        'cc_bin',
        'cc_type'
    );

    // actionFields is used to validate the XML tags in the
    // action element
     $actionFields = array(
         'amount',
         'action_type',
         'date',
         'success',
         'ip_address',
         'source',
         'api_method',
         'username',
         'response_text',
         'batch_id',
         'processor_batch_id',
         'response_code',
         'processor_response_text',
         'processor_response_code',
         'device_license_number',
         'device_nickname'
        );

    $mycurl=curl_init();
    $postStr='security_key='.$security_key.$constraints;
    $url="https://secure.easypaydirectgateway.com/api/query.php?". $postStr;
    curl_setopt($mycurl, CURLOPT_URL, $url);
    curl_setopt($mycurl, CURLOPT_RETURNTRANSFER, 1);
    $responseXML=curl_exec($mycurl);
    curl_close($mycurl);

    $testXmlSimple= new SimpleXMLElement($responseXML);

    if (!isset($testXmlSimple->transaction)) {
            throw new Exception('No transactions returned');
    }

    $transNum = 1;
    foreach($testXmlSimple->transaction as $transaction) {
        foreach ($transactionFields as $xmlField) {
            if (!isset($transaction->{$xmlField}[0])){
                throw new Exception('Error in transaction_id:'. $transaction->transaction_id[0] .' id  Transaction tag is missing  field ' . $xmlField);
            }
        }
        if (!isset ($transaction->action)) {
            throw new Exception('Error, Action tag is missing from transaction_id '. $transaction->transaction_id[0]);
        }

        $actionNum = 1;
        foreach ($transaction->action as $action){
            foreach ($actionFields as $xmlField){
                if (!isset($action->{$xmlField}[0])){
                    throw new Exception('Error with transaction_id'.$transaction->transaction_id[0].'
                                        Action number '. $actionNum . ' Action tag is missing field ' . $xmlField);
                }
            }
            $actionNum++;
        }
        $transNum++;
    }

    return;
}

try {

    $constraints = "&action_type=sale&start_date=20060913";
    $result = testXmlQuery('6457Thfj624V5r7WUwc5v6a68Zsd6YEm',$constraints);
    print "Success.\n";

} catch (Exception $e) {

    echo $e->getMessage();

}
```

```javascript

const https = require('https');
const querystring = require('querystring');

const security_key = '{security_key}';
const hostName = 'secure.easypaydirectgateway.com';
const path = '/api/query.php';
const actionType = 'sale'; // Can be any valid Query API action.

// Create the post data body to pass into request
const postData = querystring.stringify({
  'security_key': security_key,
  'action_type': actionType,
});

const options = {
  hostname: hostName,
  path: path,
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(postData)
  }
};

// Make request to Query API
const req = https.request(options, (response) => {
  console.log(`STATUS: ${response.statusCode}`);
  console.log(`HEADERS: ${JSON.stringify(response.headers)}`);

  response.on('data', (chunk) => {
    console.log(`BODY: ${chunk}`);
  });
  response.on('end', () => {
    console.log('No more data in response.');
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

// Write post data to request body
req.write(postData);
req.end();
```

[Download example as a ZIP file](https://secure.easypaydirectgateway.com/gw/merchants/resources/integration/download.php?document=threestep_example_c_sharp&tid=0ad10c2cc375855565ac2c3d7826f4b5)

Example Files:

* * *

\[ Back to Top \]

### c\_sharp/step1.aspx

```csharp
﻿<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="step1.aspx.cs" Inherits="ThreeStepExample._Default" %>

<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">

<html xmlns="http://www.w3.org/1999/xhtml" >
<head runat="server">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />

    <title>Collect non-sensitive Customer Info</title>
    <style type="text/css">
        .style1
        {
            margin-left: 150px;
        }
    </style>
</head>
<body>


        <form id="form1" runat="server" action="step1.aspx" >

            <h2>Step One: Collect non-sensitive payment information.<br /></h2>

            <h3> Customer Information</h3>
            <h4> Billing Details</h4>

              <table>
                  <tr><td>Customer Id  </td><td><asp:TextBox ID="CustomerId" runat="server"></asp:TextBox></td></tr>
                  <tr><td>Company</td><td><asp:TextBox ID="billingAddressCompany" runat="server">Acme, Inc.</asp:TextBox> </td></tr>
                  <tr><td>First Name </td><td><asp:TextBox ID="billingAddressFirstName" runat="server"> John</asp:TextBox></td></tr>
                  <tr><td>Last Name </td><td><asp:TextBox ID="billingAddressLastName" runat="server" value="Smith"/></td></tr>
                  <tr><td>Address </td><td><asp:TextBox ID="billingAddressAddress1" runat="server" value="1234 Main St."/></td></tr>
                  <tr><td>City </td><td><asp:TextBox ID="billingAddressCity" runat="server" value="Beverly Hills"/></td></tr>
                  <tr><td>State/Province </td><td><asp:TextBox ID="billingAddressState" runat="server" value="CA"/></td></tr>
                  <tr><td>Zip/Postal </td><td><asp:TextBox ID="billingAddressZip" runat="server" value="90210"/></td></tr>
                  <tr><td>Country </td><td><asp:TextBox ID="billingAddressCountry" runat="server" value="US"/></td></tr>
                  <tr><td>Phone Number </td><td><asp:TextBox ID="billingAddressPhone" runat="server" value="555-555-5555"/></td></tr>
                  <tr><td>Email Address </td><td><asp:TextBox ID="billingAddressEmail" runat="server" value="test@example.com"/></td></tr>

		          <tr><td><h4><br /> Shipping Details</h4> </td></tr>
                  <tr><td>First Name </td><td><asp:TextBox ID="shippingAddressFirstName" runat="server" value="Mary"/></td></tr>
                  <tr><td>Last Name </td><td><asp:TextBox ID="shippingAddressLastName" runat="server" value="Smith"/></td></tr>
                  <tr><td>Address </td><td><asp:TextBox ID="shippingAddressAddress1" runat="server" value="1234 Main St."/></td></tr>
                  <tr><td>Suite</td><td><asp:TextBox ID="shippingAddressAddress2" runat="server" value="Unit #2"/></td></tr>
                  <tr><td>City </td><td><asp:TextBox ID="shippingAddressCity"  runat ="server"    value="Beverly Hills"/></td></tr>
                   <tr><td>State/Province </td><td><asp:TextBox ID="shippingAddressState" runat="server"  value="CA"/></td></tr>
                  <tr><td>Zip/Postal </td><td><asp:TextBox ID="shippingAddressZip" runat="server" value="90210"/></td></tr>
                  <tr><td>Country</td><td><asp:TextBox ID="shippingAddressCountry" runat="server" value="US"/></td></tr>
                  <tr><td>Phone Number </td><td><asp:TextBox ID="shippingAddressPhone" runat="server" value="555-555-5555"/></td></tr>
                  <tr><td colspan="2">&nbsp;</td></tr>
	              <tr><td colspan="2" align="center">Total Amount $12.00 </td></tr>
                  <tr><td colspan="2" align="center"><asp:Button   runat="server"    Text="Submit Step One"
                           ID="submitStepOne" onclick="stepOneSubmit_Click" ></asp:Button> </td></tr>
              </table>

        </form>




</body>
</html>
```

* * *

\[ Back to Top \]

### c\_sharp/step1.aspx.cs

```csharp
﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Windows.Forms;
using System.Web.UI;
using System.Xml;
using System.Web.UI.WebControls;
using System.IO;
using System.Net;
using System.Text;
using System.Security.Cryptography.X509Certificates;

namespace ThreeStepExample
{
	public class Program :ICertificatePolicy {
		public bool CheckValidationResult (ServicePoint sp,
			X509Certificate certificate, WebRequest request, int error)
		{
			return true;
		}
}
    public partial class _Default :System.Web.UI.Page
    {
        protected void Page_Load(object sender, EventArgs e)
        {

            if (Request["token-id"] != null)
            {
                //MessageBox.Show(Request["token-id"]);
                XmlDocument xmlRequest = new XmlDocument();

                XmlDeclaration xmlDecl = xmlRequest.CreateXmlDeclaration("1.0", "UTF-8", "yes");

                XmlElement root = xmlRequest.DocumentElement;
                xmlRequest.InsertBefore(xmlDecl, root);

                XmlElement xmlCompleteTransaction = xmlRequest.CreateElement("complete-action");

                XmlElement xmlApiKey = xmlRequest.CreateElement("api-key");

                xmlApiKey.InnerText = "2F822Rw39fx762MaV7Yy86jXGTC7sCDy";

                xmlCompleteTransaction.AppendChild(xmlApiKey);

                XmlElement xmlTokenId = xmlRequest.CreateElement("token-id");
                xmlTokenId.InnerText = Request["token-id"];
                xmlCompleteTransaction.AppendChild(xmlTokenId);

                xmlRequest.AppendChild(xmlCompleteTransaction);

                string responseFromServer = this.sendXMLRequest(xmlRequest);
                XmlReader responseReader = XmlReader.Create(new StringReader(responseFromServer));

                XmlDocument xDoc = new XmlDocument();
                xDoc.Load(responseReader);
                XmlNodeList response = xDoc.GetElementsByTagName("result");
                XmlNodeList responseText = xDoc.GetElementsByTagName("result-text");

                Session["data"] = responseFromServer;
                Session["result"] = response[0].InnerText;
                Session["result-text"] = responseText[0].InnerText;

                responseReader.Close();
                Server.Transfer("step3.aspx");

            }


        }

        protected void stepOneSubmit_Click(object sender, EventArgs e)
        {


            XmlDocument  xmlRequest = new XmlDocument();

            XmlDeclaration xmlDecl = xmlRequest.CreateXmlDeclaration("1.0","UTF-8","yes");

            XmlElement root = xmlRequest.DocumentElement;
            xmlRequest.InsertBefore(xmlDecl, root);

            XmlElement xmlSale = xmlRequest.CreateElement("sale");

            XmlElement xmlApiKey = xmlRequest.CreateElement("api-key");

			xmlApiKey.InnerText = "2F822Rw39fx762MaV7Yy86jXGTC7sCDy";

            xmlSale.AppendChild(xmlApiKey);

            XmlElement xmlRedirectUrl = xmlRequest.CreateElement("redirect-url");
            xmlRedirectUrl.InnerText = Request.ServerVariables["HTTP_REFERER"];
            xmlSale.AppendChild(xmlRedirectUrl);

            XmlElement xmlAmount = xmlRequest.CreateElement("amount");
            xmlAmount.InnerText = "12.00";
            xmlSale.AppendChild(xmlAmount);

            XmlElement xmlRemoteAddr = xmlRequest.CreateElement("ip-address");
            xmlRemoteAddr.InnerText = Request.ServerVariables["REMOTE_ADDR"];
            xmlSale.AppendChild(xmlRemoteAddr);

            XmlElement xmlCurrency = xmlRequest.CreateElement("currency");
            xmlCurrency.InnerText = "USD";
            xmlSale.AppendChild(xmlCurrency);

            XmlElement xmlOrderId = xmlRequest.CreateElement("order-id");
            xmlOrderId.InnerText = "1234";
            xmlSale.AppendChild(xmlOrderId);

            XmlElement xmlOrderDescription = xmlRequest.CreateElement("order-description");
            xmlOrderDescription.InnerText = "Small Order";
            xmlSale.AppendChild(xmlOrderDescription);

            XmlElement xmlMDF1 = xmlRequest.CreateElement("merchant-defined-field-1");
            xmlMDF1.InnerText = "Red";
            xmlSale.AppendChild(xmlMDF1);

            XmlElement xmlMDF2 = xmlRequest.CreateElement("merchant-defined-field-2");
            xmlMDF2.InnerText = "Medium";
            xmlSale.AppendChild(xmlMDF2);

            XmlElement xmlTax = xmlRequest.CreateElement("tax-amount");
            xmlTax.InnerText = "0.00";
            xmlSale.AppendChild(xmlTax);

            XmlElement xmlShipping = xmlRequest.CreateElement("shipping-amount");
            xmlShipping.InnerText = "0.00";
            xmlSale.AppendChild(xmlShipping);

            if (!(CustomerId.Text.Equals("") || CustomerId.Text.Equals('0')))
            {
                XmlElement xmlCustomerId = xmlRequest.CreateElement("customer-vault-id");
                xmlCustomerId.InnerText = CustomerId.Text;
                xmlSale.AppendChild(xmlCustomerId);

            }
            //To Add a customer
           /* else
            {
                XmlElement xmlAddCustomer = xmlRequest.CreateElement("add-customer");

                XmlElement xmlCustomerId = xmlRequest.CreateElement("customer-vault-id");
                xmlCustomerId.InnerText = "411";
                xmlAddCustomer.AppendChild(xmlCustomerId);

                xmlSale.AppendChild(xmlAddCustomer);
            }
            */


            XmlElement xmlBillingAddress = xmlRequest.CreateElement("billing");

            XmlElement xmlFirstName = xmlRequest.CreateElement("first-name");
            xmlFirstName.InnerText = billingAddressFirstName.Text;
            xmlBillingAddress.AppendChild(xmlFirstName);

            XmlElement xmlLastName = xmlRequest.CreateElement("last-name");
            xmlLastName.InnerText = billingAddressLastName.Text;
            xmlBillingAddress.AppendChild(xmlLastName);

            XmlElement xmlAddress1 = xmlRequest.CreateElement("address1");
            xmlAddress1.InnerText = billingAddressAddress1.Text;
            xmlBillingAddress.AppendChild(xmlAddress1);

            XmlElement xmlCity = xmlRequest.CreateElement("city");
            xmlCity.InnerText = billingAddressCity.Text;
            xmlBillingAddress.AppendChild(xmlCity);

            XmlElement xmlState = xmlRequest.CreateElement("state");
            xmlState.InnerText = billingAddressState.Text;
            xmlBillingAddress.AppendChild(xmlState);

            XmlElement xmlZip = xmlRequest.CreateElement("postal");
            xmlZip.InnerText = billingAddressZip.Text;
            xmlBillingAddress.AppendChild(xmlZip);

            XmlElement xmlCountry = xmlRequest.CreateElement("country");
            xmlCountry.InnerText = billingAddressCountry.Text;
            xmlBillingAddress.AppendChild(xmlCountry);

            XmlElement xmlPhone = xmlRequest.CreateElement("phone");
            xmlPhone.InnerText = billingAddressPhone.Text;
            xmlBillingAddress.AppendChild(xmlPhone);

            XmlElement xmlCompany = xmlRequest.CreateElement("company");
            xmlCompany.InnerText = billingAddressCompany.Text;
            xmlBillingAddress.AppendChild(xmlCompany);

            XmlElement xmlAddress2 = xmlRequest.CreateElement("address2");
            xmlAddress2.InnerText = billingAddressAddress1.Text;
            xmlBillingAddress.AppendChild(xmlAddress2);

            XmlElement xmlFax = xmlRequest.CreateElement("fax");
            xmlFax.InnerText = "";
            xmlBillingAddress.AppendChild(xmlFax);


            xmlSale.AppendChild(xmlBillingAddress);

            //////////

            XmlElement xmlShippingAddress = xmlRequest.CreateElement("shipping");

            XmlElement xmlSFirstName = xmlRequest.CreateElement("first-name");
            xmlSFirstName.InnerText = shippingAddressFirstName.Text;
            xmlShippingAddress.AppendChild(xmlSFirstName);

            XmlElement xmlSLastName = xmlRequest.CreateElement("last-name");
            xmlSLastName.InnerText = shippingAddressLastName.Text;
            xmlShippingAddress.AppendChild(xmlSLastName);

            XmlElement xmlSAddress1 = xmlRequest.CreateElement("address1");
            xmlSAddress1.InnerText = shippingAddressAddress1.Text;
            xmlShippingAddress.AppendChild(xmlSAddress1);

            XmlElement xmlSCity = xmlRequest.CreateElement("city");
            xmlSCity.InnerText = shippingAddressCity.Text;
            xmlShippingAddress.AppendChild(xmlSCity);

            XmlElement xmlSState = xmlRequest.CreateElement("state");
            xmlSState.InnerText = shippingAddressState.Text;
            xmlShippingAddress.AppendChild(xmlSState);

            XmlElement xmlSZip = xmlRequest.CreateElement("postal");
            xmlSZip.InnerText = shippingAddressZip.Text;
            xmlShippingAddress.AppendChild(xmlSZip);

            XmlElement xmlSCountry = xmlRequest.CreateElement("country");
            xmlSCountry.InnerText = shippingAddressCountry.Text;
            xmlShippingAddress.AppendChild(xmlSCountry);

            XmlElement xmlSPhone = xmlRequest.CreateElement("phone");
            xmlSPhone.InnerText = shippingAddressPhone.Text;
            xmlShippingAddress.AppendChild(xmlSPhone);

            XmlElement xmlSCompany = xmlRequest.CreateElement("company");
            xmlSCompany.InnerText = "";
            xmlShippingAddress.AppendChild(xmlSCompany);

            XmlElement xmlSAddress2 = xmlRequest.CreateElement("address2");
            xmlSAddress2.InnerText = shippingAddressAddress1.Text;
            xmlShippingAddress.AppendChild(xmlSAddress2);

            XmlElement xmlSFax = xmlRequest.CreateElement("fax");
            xmlFax.InnerText = "";
            xmlShippingAddress.AppendChild(xmlSFax);

            xmlSale.AppendChild(xmlShippingAddress);

            ////////////////

            XmlElement xmlProduct = xmlRequest.CreateElement("product");

            XmlElement xmlSku = xmlRequest.CreateElement("product-code");
            xmlSku.InnerText = "SKU-123456";
            xmlProduct.AppendChild(xmlSku);

            XmlElement xmlDescription = xmlRequest.CreateElement("description");
            xmlDescription.InnerText = "Books";
            xmlProduct.AppendChild(xmlDescription);

            XmlElement xmlQuantity = xmlRequest.CreateElement("quantity");
            xmlQuantity.InnerText = "1";
            xmlProduct.AppendChild(xmlQuantity);

            XmlElement xmlUnit = xmlRequest.CreateElement("unit-of-measure");
            xmlUnit.InnerText = "1";
            xmlProduct.AppendChild(xmlUnit);


            XmlElement xmlUnitAmount = xmlRequest.CreateElement("total-amount");
            xmlUnitAmount.InnerText = "1";
            xmlProduct.AppendChild(xmlUnitAmount);

            XmlElement xmlUnitDiscount = xmlRequest.CreateElement("discount-amount");
            xmlUnitDiscount.InnerText = "0.00";
            xmlProduct.AppendChild(xmlUnitDiscount);

            XmlElement xmlUnitTax = xmlRequest.CreateElement("tax-amount");
            xmlUnitTax.InnerText = "0.00";
            xmlProduct.AppendChild(xmlUnitTax);

            XmlElement xmlTaxRate = xmlRequest.CreateElement("tax-rate");
            xmlTaxRate.InnerText = "0.01";
            xmlProduct.AppendChild(xmlTaxRate);

            xmlSale.AppendChild(xmlProduct);
            ///////////////

            XmlElement xmlProduct2 = xmlRequest.CreateElement("product");

            XmlElement xmlSku2 = xmlRequest.CreateElement("product-code");
            xmlSku2.InnerText = "SKU-654321";
            xmlProduct2.AppendChild(xmlSku2);

            XmlElement xmlDescription2 = xmlRequest.CreateElement("description");
            xmlDescription2.InnerText = "Videos";
            xmlProduct2.AppendChild(xmlDescription2);

            XmlElement xmlQuantity2 = xmlRequest.CreateElement("quantity");
            xmlQuantity2.InnerText = "1";
            xmlProduct2.AppendChild(xmlQuantity2);

            XmlElement xmlUnit2 = xmlRequest.CreateElement("unit-of-measure");
            xmlUnit2.InnerText = "";
            xmlProduct2.AppendChild(xmlUnit2);

            XmlElement xmlUnitAmount2 = xmlRequest.CreateElement("total-amount");
            xmlUnitAmount2.InnerText = "2";
            xmlProduct2.AppendChild(xmlUnitAmount2);

            XmlElement xmlUnitDiscount2 = xmlRequest.CreateElement("discount-amount");
            xmlUnitDiscount2.InnerText = "0.00";
            xmlProduct2.AppendChild(xmlUnitDiscount2);

            XmlElement xmlUnitTax2 = xmlRequest.CreateElement("tax-amount");
            xmlUnitTax2.InnerText = "0.00";
            xmlProduct2.AppendChild(xmlUnitTax2);

            XmlElement xmlTaxRate2 = xmlRequest.CreateElement("tax-rate");
            xmlTaxRate2.InnerText = "0.01";
            xmlProduct2.AppendChild(xmlTaxRate2);

            xmlSale.AppendChild(xmlProduct2);

            xmlRequest.AppendChild(xmlSale);

            string responseFromServer = this.sendXMLRequest(xmlRequest);


            XmlReader responseReader = XmlReader.Create(new StringReader(responseFromServer));


            XmlDocument xDoc = new XmlDocument();
            xDoc.Load(responseReader);
            XmlNodeList response = xDoc.GetElementsByTagName("result");
            if (response[0].InnerText.Equals("1"))
            {
                XmlNodeList formUrl = xDoc.GetElementsByTagName("form-url");
                Session["formURL"] = "";
                Session["formURL"] =  formUrl[0].InnerText;
                responseReader.Close();
                Server.Transfer("step2.aspx");

            }
        }

        protected string sendXMLRequest(XmlDocument xmlRequest)
        {
		ServicePointManager.CertificatePolicy = new Program ();
            string uri = "https://secure.easypaydirectgateway.com/api/v2/three-step";

            WebRequest req = WebRequest.Create(uri);
            //req.Proxy = WebProxy.GetDefaultProxy(); // Enable if using proxy
            req.Method = "POST";        // Post method
            req.ContentType = "text/xml";     // content type
            // Wrap the request stream with a text-based writer
            StreamWriter writer = new StreamWriter(req.GetRequestStream());
            // Write the XML text into the stream

            xmlRequest.Save(writer);

            writer.Close();
            // Send the data to the webserver
            WebResponse rsp = req.GetResponse();

            Stream dataStream = rsp.GetResponseStream();
            // Open the stream using a StreamReader
            StreamReader reader = new StreamReader(dataStream);
            // Read the content.
            string responseFromServer = reader.ReadToEnd();

            // int index = responseFromServer.IndexOf("<?");
            //string substr = responseFromServer.Substring(index);
            // Display the content.
            //MessageBox.Show(responseFromServer);
            // Clean up the streams.

            reader.Close();
            dataStream.Close();
            rsp.Close();

            return responseFromServer;

        }


    }



}
```

* * *

\[ Back to Top \]

### c\_sharp/step1.aspx.designer.cs

```csharp
﻿// ------------------------------------------------------------------------------
//  <autogenerated>
//      This code was generated by a tool.
//      Mono Runtime Version: 4.0.30319.1
//
//      Changes to this file may cause incorrect behavior and will be lost if
//      the code is regenerated.
//  </autogenerated>
// ------------------------------------------------------------------------------

namespace ThreeStepExample {


	public partial class _Default {

		protected System.Web.UI.HtmlControls.HtmlForm form1;

		protected System.Web.UI.WebControls.TextBox CustomerId;

		protected System.Web.UI.WebControls.TextBox billingAddressCompany;

		protected System.Web.UI.WebControls.TextBox billingAddressFirstName;

		protected System.Web.UI.WebControls.TextBox billingAddressLastName;

		protected System.Web.UI.WebControls.TextBox billingAddressAddress1;

		protected System.Web.UI.WebControls.TextBox billingAddressCity;

		protected System.Web.UI.WebControls.TextBox billingAddressState;

		protected System.Web.UI.WebControls.TextBox billingAddressZip;

		protected System.Web.UI.WebControls.TextBox billingAddressCountry;

		protected System.Web.UI.WebControls.TextBox billingAddressPhone;

		protected System.Web.UI.WebControls.TextBox billingAddressEmail;

		protected System.Web.UI.WebControls.TextBox shippingAddressFirstName;

		protected System.Web.UI.WebControls.TextBox shippingAddressLastName;

		protected System.Web.UI.WebControls.TextBox shippingAddressAddress1;

		protected System.Web.UI.WebControls.TextBox shippingAddressAddress2;

		protected System.Web.UI.WebControls.TextBox shippingAddressCity;

		protected System.Web.UI.WebControls.TextBox shippingAddressState;

		protected System.Web.UI.WebControls.TextBox shippingAddressZip;

		protected System.Web.UI.WebControls.TextBox shippingAddressCountry;

		protected System.Web.UI.WebControls.TextBox shippingAddressPhone;

		protected System.Web.UI.WebControls.Button submitStepOne;
	}
}
```

* * *

\[ Back to Top \]

### c\_sharp/step2.aspx

```csharp
﻿<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="step2.aspx.cs" Inherits="ThreeStepExample.WebForm1" %>

<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">

<html xmlns="http://www.w3.org/1999/xhtml" >
<head runat="server">
    <title></title>
</head>
<body>
     <form id="form1"  runat="server" action="step2.aspx" >

            <h2>Step Two: Collect sensitive payment information and POST directly to payment gateway<br /></h2>

            <h3> Payment Information</h3>


              <table>
                  <tr><td>Credit Card Number  </td><td><asp:TextBox ID="cc_number" name="cc_number" runat="server" >4111111111111111</asp:TextBox></td></tr>
                  <tr><td>Expiration Date</td><td><asp:TextBox ID="cc_exp"  name="cc_exp" runat="server">1012</asp:TextBox> </td></tr>
                  <tr><td>CVV </td><td><asp:TextBox ID="cvv" name="cvv" runat="server"> </asp:TextBox></td></tr>
                  <tr><td colspan="2">&nbsp;</td></tr>
	              <tr><td colspan="2" align="center">Total Amount $12.00 </td></tr>
                  <tr><td colspan="2" align="center"><asp:Button   runat="server"    Text="Submit Step Two"
                           ID="submitStepTwo"></asp:Button> </td></tr>
              </table>

        </form>

</body>
</html>
```

* * *

\[ Back to Top \]

### c\_sharp/step2.aspx.cs

```csharp
﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Windows.Forms;
using System.Web.UI;
using System.Web.UI.WebControls;

namespace ThreeStepExample
{
    public partial class WebForm1 : System.Web.UI.Page
    {
        protected void Page_Load(object sender, EventArgs e)
        {
            form1.Action = (string)Session["formUrl"];

        }

    }
}
```

* * *

\[ Back to Top \]

### c\_sharp/step2.aspx.designer.cs

```csharp
// ------------------------------------------------------------------------------
//  <autogenerated>
//      This code was generated by a tool.
//      Mono Runtime Version: 4.0.30319.1
//
//      Changes to this file may cause incorrect behavior and will be lost if
//      the code is regenerated.
//  </autogenerated>
// ------------------------------------------------------------------------------

namespace ThreeStepExample {


	public partial class WebForm1 {

		protected System.Web.UI.HtmlControls.HtmlForm form1;

		protected System.Web.UI.WebControls.TextBox cc_number;

		protected System.Web.UI.WebControls.TextBox cc_exp;

		protected System.Web.UI.WebControls.TextBox cvv;

		protected System.Web.UI.WebControls.Button submitStepTwo;
	}
}
```

* * *

\[ Back to Top \]

### c\_sharp/step3.aspx

```csharp
﻿<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="step3.aspx.cs" Inherits="ThreeStepExample.step3" %>

<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">

<html xmlns="http://www.w3.org/1999/xhtml" >
<head runat="server">
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
   <title>Step Three - Complete Transaciton</title>
</head>
<body>



    <form id="form1" runat="server">
    <pre>
    <p><h2>Step Three: Script automatically completes the transaction </h2></p>

        <% if(Session["result"].Equals("1"))

           { %>

            <p><h3> Transaction was Approved.</h3></p>

        <% }
           else if (Session["result"].Equals("2"))
           { %>

            <p><h3> Transaction was Declined.</h3>Decline Description: </p>

        <% }
           else
           { %>

           <p><h3> Transaction caused an Error.</h3></p>
           Error Description:


         <%} %>


        <asp:Label ID="LabelResponseText" runat="server" Height="20px" Text="Label" Width="20px"></asp:Label>
        <p><h3>XML response was:</h3></p>
        <asp:Label ID="LabelResponse"  runat="server" Height="150px" Text="Label" Width="350px"></asp:Label>
		</pre>

    </form>

</body>
</html>
```

* * *

\[ Back to Top \]

### c\_sharp/step3.aspx.cs

```csharp
﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;

namespace ThreeStepExample
{
    public partial class step3 : System.Web.UI.Page
    {
        protected void Page_Load(object sender, EventArgs e)
        {
            LabelResponse.Text = Server.HtmlEncode(Session["data"].ToString());
            if (!Session["result"].Equals("1"))
            {
                LabelResponseText.Text = (string)Session["result-text"];
            }
            else
            {
                LabelResponseText.Text = "";
            }
        }
    }
}
```

* * *

\[ Back to Top \]

### c\_sharp/step3.aspx.designer.cs

```csharp
﻿// ------------------------------------------------------------------------------
//  <autogenerated>
//      This code was generated by a tool.
//      Mono Runtime Version: 4.0.30319.1
//
//      Changes to this file may cause incorrect behavior and will be lost if
//      the code is regenerated.
//  </autogenerated>
// ------------------------------------------------------------------------------

namespace ThreeStepExample {


	public partial class step3 {

		protected System.Web.UI.HtmlControls.HtmlForm form1;

		protected System.Web.UI.WebControls.Label LabelResponseText;

		protected System.Web.UI.WebControls.Label LabelResponse;
	}
}
```

```php

// API Setup parameters
$gatewayURL = 'https://secure.easypaydirectgateway.com/api/v2/three-step';
$APIKey = '2F822Rw39fx762MaV7Yy86jXGTC7sCDy';

// If there is no POST data or a token-id, print the initial shopping cart form to get ready for Step One.
if (empty($_POST['DO_STEP_1']) && empty($_GET['token-id'])) {

    print '  <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">';
    print '
    <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <title>Collect non-sensitive Customer Info </title>
      </head>
      <body>
      <p><h2>Step One: Collect non-sensitive payment information.<br /></h2></p>

      <h3> Customer Information</h3>
      <h4> Billing Details</h4>

        <form action="" method="post">
          <table>
          <tr><td>'.nmHtmlEntities(BRAND_CUSTOMER_VAULT).' Id  </td><td><input type="text" name="customer-vault-id" value=""></td></tr>
          <tr><td>Company</td><td><input type="text" name="billing-address-company" value="Acme, Inc."></td></tr>
          <tr><td>First Name </td><td><input type="text" name="billing-address-first-name" value="John"></td></tr>
          <tr><td>Last Name </td><td><input type="text" name="billing-address-last-name" value="Smith"></td></tr>
          <tr><td>Address </td><td><input type="text" name="billing-address-address1" value="1234 Main St."></td></tr>
          <tr><td>Address 2 </td><td><input type="text" name="billing-address-address2" value="Suite 205"></td></tr>
          <tr><td>City </td><td><input type="text" name="billing-address-city" value="Beverly Hills"></td></tr>
          <tr><td>State/Province </td><td><input type="text" name="billing-address-state" value="CA"></td></tr>
          <tr><td>Zip/Postal </td><td><input type="text" name="billing-address-zip" value="90210"></td></tr>
          <tr><td>Country </td><td><input type="text" name="billing-address-country" value="US"></td></tr>
          <tr><td>Phone Number </td><td><input type="text" name="billing-address-phone" value="555-555-5555"></td></tr>
          <tr><td>Fax Number </td><td><input type="text" name="billing-address-fax" value="555-555-5555"></td></tr>
          <tr><td>Email Address </td><td><input type="text" name="billing-address-email" value="test@example.com"></td></tr>

          <tr><td><h4><br /> Shipping Details</h4>
          <tr><td>Company</td><td><input type="text" name="shipping-address-company" value="Acme, Inc."></td></tr>
          <tr><td>First Name </td><td><input type="text" name="shipping-address-first-name" value="Mary"></td></tr>
          <tr><td>Last Name </td><td><input type="text" name="shipping-address-last-name" value="Smith"></td></tr>
          <tr><td>Address </td><td><input type="text" name="shipping-address-address1" value="1234 Main St."></td></tr>
          <tr><td>Address 2</td><td><input type="text" name="shipping-address-address2" value="Suite 205"></td></tr>
          <tr><td>City </td><td><input type="text" name="shipping-address-city" value="Beverly Hills"></td></tr>
          <tr><td>State/Province </td><td><input type="text" name="shipping-address-state" value="CA"></td></tr>
          <tr><td>Zip/Postal </td><td><input type="text" name="shipping-address-zip" value="90210"></td></tr>
          <tr><td>Country</td><td><input type="text" name="shipping-address-country" value="US"></td></tr>
          <tr><td>Phone Number </td><td><input type="text" name="shipping-address-phone" value="555-555-5555"></td></tr>
          <tr><td colspan="2"> </td>
          <tr><td colspan="2" align=center>Total Amount $12.00 </td></tr>
          <tr><td colspan="2" align=center><input type="submit" value="Submit Step One"><input type="hidden" name ="DO_STEP_1" value="true"></td></tr>
          </table>

        </form>
      </body>
    </html>

    ';
}else if (!empty($_POST['DO_STEP_1'])) {

    // Initiate Step One: Now that we've collected the non-sensitive payment information, we can combine other order information and build the XML format.
    $xmlRequest = new DOMDocument('1.0','UTF-8');

    $xmlRequest->formatOutput = true;
    $xmlSale = $xmlRequest->createElement('sale');

    // Amount, authentication, and Redirect-URL are typically the bare minimum.
    appendXmlNode($xmlRequest, $xmlSale,'api-key',$APIKey);
    appendXmlNode($xmlRequest, $xmlSale,'redirect-url',$_SERVER['HTTP_REFERER']);
    appendXmlNode($xmlRequest, $xmlSale, 'amount', '12.00');
    appendXmlNode($xmlRequest, $xmlSale, 'ip-address', $_SERVER["REMOTE_ADDR"]);
    //appendXmlNode($xmlRequest, $xmlSale, 'processor-id' , 'processor-a');
    appendXmlNode($xmlRequest, $xmlSale, 'currency', 'USD');

    // Some additonal fields may have been previously decided by user
    appendXmlNode($xmlRequest, $xmlSale, 'order-id', '1234');
    appendXmlNode($xmlRequest, $xmlSale, 'order-description', 'Small Order');
    appendXmlNode($xmlRequest, $xmlSale, 'merchant-defined-field-1' , 'Red');
    appendXmlNode($xmlRequest, $xmlSale, 'merchant-defined-field-2', 'Medium');
    appendXmlNode($xmlRequest, $xmlSale, 'tax-amount' , '0.00');
    appendXmlNode($xmlRequest, $xmlSale, 'shipping-amount' , '0.00');

    /*if(!empty($_POST['customer-vault-id'])) {
        appendXmlNode($xmlRequest, $xmlSale, 'customer-vault-id' , $_POST['customer-vault-id']);
    }else {
         $xmlAdd = $xmlRequest->createElement('add-customer');
         appendXmlNode($xmlRequest, $xmlAdd, 'customer-vault-id' ,411);
         $xmlSale->appendChild($xmlAdd);
    }*/

    // Set the Billing and Shipping from what was collected on initial shopping cart form
    $xmlBillingAddress = $xmlRequest->createElement('billing');
    appendXmlNode($xmlRequest, $xmlBillingAddress,'first-name', $_POST['billing-address-first-name']);
    appendXmlNode($xmlRequest, $xmlBillingAddress,'last-name', $_POST['billing-address-last-name']);
    appendXmlNode($xmlRequest, $xmlBillingAddress,'address1', $_POST['billing-address-address1']);
    appendXmlNode($xmlRequest, $xmlBillingAddress,'city', $_POST['billing-address-city']);
    appendXmlNode($xmlRequest, $xmlBillingAddress,'state', $_POST['billing-address-state']);
    appendXmlNode($xmlRequest, $xmlBillingAddress,'postal', $_POST['billing-address-zip']);
    //billing-address-email
    appendXmlNode($xmlRequest, $xmlBillingAddress,'country', $_POST['billing-address-country']);
    appendXmlNode($xmlRequest, $xmlBillingAddress,'email', $_POST['billing-address-email']);
    appendXmlNode($xmlRequest, $xmlBillingAddress,'phone', $_POST['billing-address-phone']);
    appendXmlNode($xmlRequest, $xmlBillingAddress,'company', $_POST['billing-address-company']);
    appendXmlNode($xmlRequest, $xmlBillingAddress,'address2', $_POST['billing-address-address2']);
    appendXmlNode($xmlRequest, $xmlBillingAddress,'fax', $_POST['billing-address-fax']);
    $xmlSale->appendChild($xmlBillingAddress);

    $xmlShippingAddress = $xmlRequest->createElement('shipping');
    appendXmlNode($xmlRequest, $xmlShippingAddress,'first-name', $_POST['shipping-address-first-name']);
    appendXmlNode($xmlRequest, $xmlShippingAddress,'last-name', $_POST['shipping-address-last-name']);
    appendXmlNode($xmlRequest, $xmlShippingAddress,'address1', $_POST['shipping-address-address1']);
    appendXmlNode($xmlRequest, $xmlShippingAddress,'city', $_POST['shipping-address-city']);
    appendXmlNode($xmlRequest, $xmlShippingAddress,'state', $_POST['shipping-address-state']);
    appendXmlNode($xmlRequest, $xmlShippingAddress,'postal', $_POST['shipping-address-zip']);
    appendXmlNode($xmlRequest, $xmlShippingAddress,'country', $_POST['shipping-address-country']);
    appendXmlNode($xmlRequest, $xmlShippingAddress,'phone', $_POST['shipping-address-phone']);
    appendXmlNode($xmlRequest, $xmlShippingAddress,'company', $_POST['shipping-address-company']);
    appendXmlNode($xmlRequest, $xmlShippingAddress,'address2', $_POST['shipping-address-address2']);
    $xmlSale->appendChild($xmlShippingAddress);

    // Products already chosen by user
    $xmlProduct = $xmlRequest->createElement('product');
    appendXmlNode($xmlRequest, $xmlProduct,'product-code' , 'SKU-123456');
    appendXmlNode($xmlRequest, $xmlProduct,'description' , 'test product description');
    appendXmlNode($xmlRequest, $xmlProduct,'commodity-code' , 'abc');
    appendXmlNode($xmlRequest, $xmlProduct,'unit-of-measure' , 'lbs');
    appendXmlNode($xmlRequest, $xmlProduct,'unit-cost' , '5.00');
    appendXmlNode($xmlRequest, $xmlProduct,'quantity' , '1');
    appendXmlNode($xmlRequest, $xmlProduct,'total-amount' , '7.00');
    appendXmlNode($xmlRequest, $xmlProduct,'tax-amount' , '2.00');

    appendXmlNode($xmlRequest, $xmlProduct,'tax-rate' , '1.00');
    appendXmlNode($xmlRequest, $xmlProduct,'discount-amount', '2.00');
    appendXmlNode($xmlRequest, $xmlProduct,'discount-rate' , '1.00');
    appendXmlNode($xmlRequest, $xmlProduct,'tax-type' , 'sales');
    appendXmlNode($xmlRequest, $xmlProduct,'alternate-tax-id' , '12345');

    $xmlSale->appendChild($xmlProduct);

    $xmlProduct = $xmlRequest->createElement('product');
    appendXmlNode($xmlRequest, $xmlProduct,'product-code' , 'SKU-123456');
    appendXmlNode($xmlRequest, $xmlProduct,'description' , 'test 2 product description');
    appendXmlNode($xmlRequest, $xmlProduct,'commodity-code' , 'abc');
    appendXmlNode($xmlRequest, $xmlProduct,'unit-of-measure' , 'lbs');
    appendXmlNode($xmlRequest, $xmlProduct,'unit-cost' , '2.50');
    appendXmlNode($xmlRequest, $xmlProduct,'quantity' , '2');
    appendXmlNode($xmlRequest, $xmlProduct,'total-amount' , '7.00');
    appendXmlNode($xmlRequest, $xmlProduct,'tax-amount' , '2.00');

    appendXmlNode($xmlRequest, $xmlProduct,'tax-rate' , '1.00');
    appendXmlNode($xmlRequest, $xmlProduct,'discount-amount', '2.00');
    appendXmlNode($xmlRequest, $xmlProduct,'discount-rate' , '1.00');
    appendXmlNode($xmlRequest, $xmlProduct,'tax-type' , 'sales');
    appendXmlNode($xmlRequest, $xmlProduct,'alternate-tax-id' , '12345');

    $xmlSale->appendChild($xmlProduct);

    $xmlRequest->appendChild($xmlSale);

    // Process Step One: Submit all transaction details to the Payment Gateway except the customer's sensitive payment information.
    // The Payment Gateway will return a variable form-url.
    $data = sendXMLviaCurl($xmlRequest,$gatewayURL);

    // Parse Step One's XML response
    $gwResponse = @new SimpleXMLElement($data);
    if ((string)$gwResponse->result ==1 ) {
        // The form url for used in Step Two below
        $formURL = $gwResponse->{'form-url'};
    } else {
        throw New Exception(print " Error, received " . $data);
    }

    // Initiate Step Two: Create an HTML form that collects the customer's sensitive payment information
    // and use the form-url that the Payment Gateway returns as the submit action in that form.
    print '  <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">';

    print '

        <html>
        <head>
            <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
            <title>Collect sensitive Customer Info </title>
        </head>
        <body>';
    // Uncomment the line below if you would like to print Step One's response
    // print '<pre>' . (htmlentities($data)) . '</pre>';
    print '
        <p><h2>Step Two: Collect sensitive payment information and POST directly to payment gateway<br /></h2></p>

        <form action="'.$formURL. '" method="POST">
        <h3> Payment Information</h3>
            <table>
                <tr><td>Credit Card Number</td><td><INPUT type ="text" name="billing-cc-number" value="4111111111111111"> </td></tr>
                <tr><td>Expiration Date</td><td><INPUT type ="text" name="billing-cc-exp" value="1012"> </td></tr>
                <tr><td>CVV</td><td><INPUT type ="text" name="cvv" > </td></tr>
                <tr><Td colspan="2" align=center><INPUT type ="submit" value="Submit Step Two"></td> </tr>
            </table>
        </form>
        </body>
        </html>
        ';

} elseif (!empty($_GET['token-id'])) {

    // Step Three: Once the browser has been redirected, we can obtain the token-id and complete
    // the transaction through another XML HTTPS POST including the token-id which abstracts the
    // sensitive payment information that was previously collected by the Payment Gateway.
    $tokenId = $_GET['token-id'];
    $xmlRequest = new DOMDocument('1.0','UTF-8');
    $xmlRequest->formatOutput = true;
    $xmlCompleteTransaction = $xmlRequest->createElement('complete-action');
    appendXmlNode($xmlRequest, $xmlCompleteTransaction,'api-key',$APIKey);
    appendXmlNode($xmlRequest, $xmlCompleteTransaction,'token-id',$tokenId);
    $xmlRequest->appendChild($xmlCompleteTransaction);

    // Process Step Three
    $data = sendXMLviaCurl($xmlRequest,$gatewayURL);

    $gwResponse = @new SimpleXMLElement((string)$data);
    print '  <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">';
    print '
    <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <title>Step Three - Complete Transaction</title>
      </head>
      <body>';

    print "
        <p><h2>Step Three: Script automatically completes the transaction <br /></h2></p>";

    if ((string)$gwResponse->result == 1 ) {
        print " <p><h3> Transaction was Approved, XML response was:</h3></p>\n";
        print '<pre>' . (htmlentities($data)) . '</pre>';

    } elseif((string)$gwResponse->result == 2)  {
        print " <p><h3> Transaction was Declined.</h3>\n";
        print " Decline Description : " . (string)$gwResponse->{'result-text'} ." </p>";
        print " <p><h3>XML response was:</h3></p>\n";
        print '<pre>' . (htmlentities($data)) . '</pre>';
    } else {
        print " <p><h3> Transaction caused an Error.</h3>\n";
        print " Error Description: " . (string)$gwResponse->{'result-text'} ." </p>";
        print " <p><h3>XML response was:</h3></p>\n";
        print '<pre>' . (htmlentities($data)) . '</pre>';
    }
    print "</body></html>";

} else {
  print "ERROR IN SCRIPT<BR>";
}

  function sendXMLviaCurl($xmlRequest,$gatewayURL) {
   // helper function demonstrating how to send the xml with curl

    $ch = curl_init(); // Initialize curl handle
    curl_setopt($ch, CURLOPT_URL, $gatewayURL); // Set POST URL

    $headers = array();
    $headers[] = "Content-type: text/xml";
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers); // Add http headers to let it know we're sending XML
    $xmlString = $xmlRequest->saveXML();
    curl_setopt($ch, CURLOPT_FAILONERROR, 1); // Fail on errors
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, 1); // Allow redirects
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1); // Return into a variable
    curl_setopt($ch, CURLOPT_PORT, 443); // Set the port number
    curl_setopt($ch, CURLOPT_TIMEOUT, 30); // Times out after 30s
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $xmlString); // Add XML directly in POST

    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);

    // This should be unset in production use. With it on, it forces the ssl cert to be valid
    // before sending info.
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0);

    if (!($data = curl_exec($ch))) {
        print  "curl error =>" .curl_error($ch) ."\n";
        throw New Exception(" CURL ERROR :" . curl_error($ch));

    }
    curl_close($ch);

    return $data;
  }

  // Helper function to make building xml dom easier
  function appendXmlNode($domDocument, $parentNode, $name, $value) {
        $childNode      = $domDocument->createElement($name);
        $childNodeValue = $domDocument->createTextNode($value);
        $childNode->appendChild($childNodeValue);
        $parentNode->appendChild($childNode);
  }
```

```php

// API Setup Parameters
$gatewayURL = 'https://secure.easypaydirectgateway.com/api/v2/three-step';
$APIKey = '2F822Rw39fx762MaV7Yy86jXGTC7sCDy';

// If there is no POST data or a token-id, print the initial Customer Information form to get ready for Step One.
if (empty($_POST['DO_STEP_1'])&& empty($_GET['token-id'])) {

    print '  <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">';
    print '
    <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <title>Collect non-sensitive Customer Vault Info </title>
      </head>
      <body>
      <p><h2>Step One: Collect non-sensitive Customer Vault information.<br /></h2></p>

      <h3> Customer Information</h3>
      <h4> Billing Details</h4>

        <form action="" method="post">
          <table>
          <tr><td>Customer Vault Id  </td><td><input type="text" name="customer-vault-id" value=""></td></tr>
          <tr><td>Company</td><td><input type="text" name="billing-address-company" value="Acme, Inc."></td></tr>
          <tr><td>First Name </td><td><input type="text" name="billing-address-first-name" value="John"></td></tr>
          <tr><td>Last Name </td><td><input type="text" name="billing-address-last-name" value="Smith"></td></tr>
          <tr><td>Address </td><td><input type="text" name="billing-address-address1" value="1234 Main St."></td></tr>
          <tr><td>City </td><td><input type="text" name="billing-address-city" value="Beverly Hills"></td></tr>
          <tr><td>State/Province </td><td><input type="text" name="billing-address-state" value="CA"></td></tr>
          <tr><td>Zip/Postal </td><td><input type="text" name="billing-address-zip" value="90210"></td></tr>
          <tr><td>Country </td><td><input type="text" name="billing-address-country" value="US"></td></tr>
          <tr><td>Phone Number </td><td><input type="text" name="billing-address-phone" value="555-555-5555"></td></tr>
          <tr><td>Email Address </td><td><input type="text" name="billing-address-email" value="test@example.com"></td></tr>

          <tr><td><h4><br /> Shipping Details</h4>
          <tr><td>First Name </td><td><input type="text" name="shipping-address-first-name" value="Mary"></td></tr>
          <tr><td>Last Name </td><td><input type="text" name="shipping-address-last-name" value="Smith"></td></tr>
          <tr><td>Address </td><td><input type="text" name="shipping-address-address1" value="1234 Main St."></td></tr>
          <tr><td>Suite</td><td><input type="text" name="shipping-address-address2" value="Unit #2"></td></tr>
          <tr><td>City </td><td><input type="text" name="shipping-address-city" value="Beverly Hills"></td></tr>
          <tr><td>State/Province </td><td><input type="text" name="shipping-address-state" value="CA"></td></tr>
          <tr><td>Zip/Postal </td><td><input type="text" name="shipping-address-zip" value="90210"></td></tr>
          <tr><td>Country</td><td><input type="text" name="shipping-address-country" value="US"></td></tr>
          <tr><td colspan="2"> </td>
          <tr><td colspan="2" align=center><input type="submit" value="Submit Step One"><input type="hidden" name ="DO_STEP_1" value="true"></td></tr>
          </table>

        </form>
      </body>
    </html>

    ';
}else if (!empty($_POST['DO_STEP_1'])) {

    // Initiate Step One: Now that we've collected the non-sensitive customer information, we can combine other customer information and build the XML format.
    $xmlRequest = new DOMDocument('1.0','UTF-8');

    $xmlRequest->formatOutput = true;
    $xmlSale = $xmlRequest->createElement('add-customer');

    // Authentication, Redirect-URL  are typically the bare minimum.
    appendXmlNode($xmlRequest, $xmlSale,'api-key',$APIKey);
    appendXmlNode($xmlRequest, $xmlSale,'redirect-url',$_SERVER['HTTP_REFERER']);

    // Some additonal fields may have been previously decided by user

    appendXmlNode($xmlRequest, $xmlSale, 'merchant-defined-field-1' , 'Red');
    appendXmlNode($xmlRequest, $xmlSale, 'merchant-defined-field-2', 'Medium');

    if(!empty($_POST['customer-vault-id'])) {
        appendXmlNode($xmlRequest, $xmlSale, 'customer-vault-id' , $_POST['customer-vault-id']);
    }

    // Set the Billing & Shipping from what was collected on initial shopping cart form
    $xmlBillingAddress = $xmlRequest->createElement('billing');
    appendXmlNode($xmlRequest, $xmlBillingAddress,'first-name', $_POST['billing-address-first-name']);
    appendXmlNode($xmlRequest, $xmlBillingAddress,'last-name', $_POST['billing-address-last-name']);
    appendXmlNode($xmlRequest, $xmlBillingAddress,'address1', $_POST['billing-address-address1']);
    appendXmlNode($xmlRequest, $xmlBillingAddress,'city', $_POST['billing-address-city']);
    appendXmlNode($xmlRequest, $xmlBillingAddress,'state', $_POST['billing-address-state']);
    appendXmlNode($xmlRequest, $xmlBillingAddress,'postal', $_POST['billing-address-zip']);
    //billing-address-email
    appendXmlNode($xmlRequest, $xmlBillingAddress,'country', $_POST['billing-address-country']);
    appendXmlNode($xmlRequest, $xmlBillingAddress,'email', $_POST['billing-address-email']);
    appendXmlNode($xmlRequest, $xmlBillingAddress,'phone', $_POST['billing-address-phone']);
    appendXmlNode($xmlRequest, $xmlBillingAddress,'company', $_POST['billing-address-company']);
    $xmlSale->appendChild($xmlBillingAddress);

    $xmlShippingAddress = $xmlRequest->createElement('shipping');
    appendXmlNode($xmlRequest, $xmlShippingAddress,'first-name', $_POST['shipping-address-first-name']);
    appendXmlNode($xmlRequest, $xmlShippingAddress,'last-name', $_POST['shipping-address-last-name']);
    appendXmlNode($xmlRequest, $xmlShippingAddress,'address1', $_POST['shipping-address-address1']);
    appendXmlNode($xmlRequest, $xmlShippingAddress,'city', $_POST['shipping-address-city']);
    appendXmlNode($xmlRequest, $xmlShippingAddress,'state', $_POST['shipping-address-state']);
    appendXmlNode($xmlRequest, $xmlShippingAddress,'postal', $_POST['shipping-address-zip']);
    appendXmlNode($xmlRequest, $xmlShippingAddress,'country', $_POST['shipping-address-country']);
    appendXmlNode($xmlRequest, $xmlShippingAddress,'address2', $_POST['shipping-address-address2']);
    $xmlSale->appendChild($xmlShippingAddress);

    $xmlRequest->appendChild($xmlSale);

    // Process Step One: Submit all customer details to the Payment Gateway except the customer's sensitive payment information.
    // The Payment Gateway will return a variable form-url.
    $data = sendXMLviaCurl($xmlRequest,$gatewayURL);

    // Parse Step One's XML response
    $gwResponse = @new SimpleXMLElement($data);
    if ((string)$gwResponse->result ==1 ) {
        // The form url for used in Step Two below
        $formURL = $gwResponse->{'form-url'};
    } else {
        throw New Exception(print " Error, received " . $data);
    }

    // Initiate Step Two: Create an HTML form that collects the customer's sensitive payment information
    // and use the form-url that the Payment Gateway returns as the submit action in that form.
    print '  <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">';

    print '

        <html>
        <head>
            <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
            <title>Collect sensitive Customer Info </title>
        </head>
        <body>';
    // Uncomment the line below if you would like to print Step One's response
    // print '<pre>' . (htmlentities($data)) . '</pre>';

    print '
        <p><h2>Step Two: Collect sensitive payment information and POST directly to payment gateway<br /></h2></p>

        <form action="'.$formURL. '" method="POST">
        <h3> Payment Information</h3>
            <table>
                <tr><td>Credit Card Number</td><td><INPUT type ="text" name="billing-cc-number" value="4111111111111111"> </td></tr>
                <tr><td>Expiration Date</td><td><INPUT type ="text" name="billing-cc-exp" value="1014"> </td></tr>
                <tr><Td colspan="2" align=center><INPUT type ="submit" value="Submit Step Two"></td> </tr>
            </table>
        </form>
        </body>
        </html>
        ';
    // NOTE: CVV cannot be stored, per PCI Requirements

} elseif (!empty($_GET['token-id'])) {

    // Step Three: Once the browser has been redirected, we can obtain the token-id and complete
    // the Customer Vault Add through another XML HTTPS POST including the token-id which abstracts the
    // sensitive payment information that was previously collected by the Payment Gateway.
    $tokenId = $_GET['token-id'];
    $xmlRequest = new DOMDocument('1.0','UTF-8');
    $xmlRequest->formatOutput = true;
    $xmlCompleteTransaction = $xmlRequest->createElement('complete-action');
    appendXmlNode($xmlRequest, $xmlCompleteTransaction,'api-key',$APIKey);
    appendXmlNode($xmlRequest, $xmlCompleteTransaction,'token-id',$tokenId);
    $xmlRequest->appendChild($xmlCompleteTransaction);

    // Process Step Three
    $data = sendXMLviaCurl($xmlRequest,$gatewayURL);

    $gwResponse = @new SimpleXMLElement((string)$data);
    print '  <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">';
    print '
    <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <title>Step Three - Complete Add Customer </title>
      </head>
      <body>';

    print "
        <p><h2>Step Three: Script automatically completes the process of adding the Customer Vault record <br /></h2></p>";

    if ((string)$gwResponse->result == 1 ) {
        print " <p><h3> Customer Vault was Added, XML response was:</h3></p>\n";
        print '<pre>' . (htmlentities($data)) . '</pre>';

    } elseif((string)$gwResponse->result == 2)  {
        print " <p><h3> Customer Vault was Not Added</h3>\n";
        print "  Reason : " . (string)$gwResponse->{'result-text'} ." </p>";
        print " <p><h3>XML response was:</h3></p>\n";
        print '<pre>' . (htmlentities($data)) . '</pre>';
    } else {
        print " <p><h3> Customer Vault Add caused an Error.</h3>\n";
        print " Error Description: " . (string)$gwResponse->{'result-text'} ." </p>";
        print " <p><h3>XML response was:</h3></p>\n";
        print '<pre>' . (htmlentities($data)) . '</pre>';
    }
    print "</body></html>";

} else {
  print "ERROR IN SCRIPT<BR>";
}

  function sendXMLviaCurl($xmlRequest,$gatewayURL) {
   // helper function demonstrating how to send the xml with curl

    $ch = curl_init(); // Initialize curl handle
    curl_setopt($ch, CURLOPT_URL, $gatewayURL); // Set POST URL

    $headers = array();
    $headers[] = "Content-type: text/xml";
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers); // Add http headers to let it know we're sending XML
    $xmlString = $xmlRequest->saveXML();
    curl_setopt($ch, CURLOPT_FAILONERROR, 1); // Fail on errors
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, 1); // Allow redirects
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1); // Return into a variable
    curl_setopt($ch, CURLOPT_PORT, 443); // Set the port number
    curl_setopt($ch, CURLOPT_TIMEOUT, 30); // Times out after 30s
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $xmlString); // Add XML directly in POST

    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);

    // This should be unset in production use. With it on, it forces the ssl cert to be valid
    // before sending info.
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0);

    if (!($data = curl_exec($ch))) {
        print  "curl error =>" .curl_error($ch) ."\n";
        throw New Exception(" CURL ERROR :" . curl_error($ch));

    }
    curl_close($ch);

    return $data;
  }

  // Helper function to make building xml dom easier
  function appendXmlNode($domDocument, $parentNode, $name, $value) {
        $childNode      = $domDocument->createElement($name);
        $childNodeValue = $domDocument->createTextNode($value);
        $childNode->appendChild($childNodeValue);
        $parentNode->appendChild($childNode);
  }
```

```php

<?
// Insert your security key ID here
$gw_merchantKeyId = '[[Gateway Key ID Here]]';
// Insert your security key here
$gw_merchantKeyText = '[[Gateway Key Text Here]]';

function gw_printField($name, $value = "") {
    global $gw_merchantKeyText;
    static $fields;

    // Generate the hash
    if($name == "hash") {
        $stringToHash = implode('|', array_values($fields)) .
            "|" . $gw_merchantKeyText;
        $value = implode("|", array_keys($fields)) . "|" . md5($stringToHash);
    } else {
        $fields[$name] = $value;
    }
    print "<INPUT TYPE=HIDDEN NAME=\"$name\" VALUE=\"$value\">\n";
}
?>

<FORM METHOD=POST
    ACTION="https://secure.easypaydirectgateway.com/cart/cart.php">
<INPUT TYPE=HIDDEN NAME="customer_receipt" VALUE="true">
<INPUT TYPE=HIDDEN NAME="key_id" VALUE="<?=$gw_merchantKeyId?>">
<INPUT TYPE=HIDDEN NAME="url_finish" VALUE="http://example.org/finsh_url.html">
<?
    // Print the description, SKU, shipping, and amount using the gw_printField
    // function. Don't call the gw_printField function for fields that you
    // wish to omit (ie. shipping)
?>
<? gw_printField("action", "process_fixed"); ?>
<? gw_printField("order_description", "Product #1"); ?>
<? gw_printField("shipping", "fixed|5.00"); ?>
<? gw_printField("amount", "7.95"); ?>
<?
    // Once all product information fields are printed, print the hash field
    // There is no need to specify a value when printing the hash field.
?>
<? gw_printField("hash"); ?>

<INPUT TYPE=SUBMIT VALUE="Buy">
</FORM>
```

```basic

<%
' Do not forget obtain md5_lib.asp from our code samples page:'
' https://secure.easypaydirectgateway.com/merchants/resources/examples.php'
%>
<!--#include virtual="md5_lib.asp"-->
<%
' A security key id and key text can be obtained within the Merchant Control'
' Panel, under Options>Security Keys'
Private Const gw_merchantKeyId = "[[Gateway Key ID Here]]"
Private Const gw_merchantKeyText = "[[Gateway Key Text Here]]"

Private gw_hashNames
Private gw_hashValues

Function gw_printField(name, value)
	if IsNull(value) Then
		gw_hashValues = gw_hashValues & gw_merchantKeyText
		hashedResult = MD5(gw_hashValues)
		value = gw_hashNames & hashedResult

		gw_hashNames = Null
		gw_hashValues = Null
	Else
		gw_hashNames = gw_hashNames & name & "|"
		gw_hashValues = gw_hashValues & value & "|"
	End If

	gw_printField = "<INPUT TYPE=HIDDEN NAME=""" & name & _
        """ VALUE=""" & value & """>" & vbCrLf
End Function
%>
<FORM
	METHOD=POST
	ACTION="https://secure.easypaydirectgateway.com/cart/cart.php">
<INPUT TYPE=HIDDEN NAME="customer_receipt" VALUE="true">
<INPUT TYPE=HIDDEN NAME="key_id" VALUE="<%=gw_merchantKeyId%>">
<%
' Print the description, SKU, shipping, and amount using the gw_printField
' function
%>
<%=gw_printField("action", "process_cart") %>
<%=gw_printField("product_description_1", "Product #1") %>
<%=gw_printField("product_sku_1", "BK001") %>
<%=gw_printField("product_shipping_1", "fixed|3.95|2.00") %>
<%=gw_printField("product_amount_1", "7.95") %>
<%
' Once all product information fields are printed, print the hash field.
' There is no need to specify a value when printing the hash field.'
%>
<%=gw_printField("hash", NULL) %>

How many books do you want?
<INPUT TYPE=TEXT NAME="product_quantity_1" SIZE=3><BR>
<INPUT TYPE=SUBMIT VALUE="Place Order">
</FORM>
```

# Simple Lightbox Example

```xml

<html>
    <script src="https://secure.easypaydirectgateway.com/token/Collect.js" data-tokenization-key="your-token-key-here"></script>
    <body>
        <h1>CollectJS Payment Form</h1>
        <form action="/your-page.php" method="post">
            <table>
                <tr>
                    <td>First Name</td>
                    <td><input size="30" type="text" name="fname" value="Test" /></td>
                </tr>
                <tr>
                    <td>Last Name</td>
                    <td><input size="30" type="text" name="lname" value="User" /></td>
                </tr>
                <tr>
                    <td>Address</td>
                    <td><input size="30" type="text" name="address" value="123 Main Street"></td>
                </tr>
                <tr>
                    <td>City</td>
                    <td><input size="30" type="text" name="city" value="Beverley Hills"></td>
                </tr>
                <tr>
                    <td>State</td>
                    <td><input size="30" type="text" name="state" value="CA"></td>
                </tr>
                <tr>
                    <td>Zip</td>
                    <td><input size="30" type="text" name="zip" value="90210"></td>
                </tr>
                <tr>
                    <td>Country</td>
                    <td><input size="30" type="text" name="country" value="US"></td>
                </tr>
                <tr>
                    <td>Phone</td>
                    <td><input size="30" type="text" name="phone" value="5555555555"></td>
                </tr>
            </table>
            <br>
            <button id="payButton" type="button">Submit Payment</button>
        </form>
    </body>
</html>


```

# Advanced HTML Lightbox Example

```xml

<html>
    <head>
        <script
            src="https://secure.easypaydirectgateway.com/token/Collect.js"
            data-tokenization-key="your-token-key-here"
            data-payment-selector=".customPayButton"
            data-theme="bootstrap"
            data-primary-color="#ff288d"
            data-secondary-color="#ffe200"
            data-button-text="SUBMIT ME!"
            data-payment-type="cc"
            data-field-cvv-display="hide"
            data-instruction-text="Enter Card Information"
            data-price="1.00"
            data-currency="USD"
            data-country="US"
            data-field-google-pay-shipping-address-required="true"
            data-field-google-pay-shipping-address-parameters-phone-number-required="true"
            data-field-google-pay-shipping-address-parameters-allowed-country-codes="US,CA"
            data-field-google-pay-billing-address-required="true"
            data-field-google-pay-billing-address-parameters-phone-number-required="true"
            data-field-google-pay-billing-address-parameters-format="MIN"
            data-field-google-pay-email-required="true"
            data-field-google-pay-button-type="buy"
            data-field-google-pay-button-locale="en"
            data-field-google-pay-button-color="default"
            data-field-apple-pay-shipping-type="delivery"
            data-field-apple-pay-shipping-methods='[{"label":"Free Standard Shipping","amount":"0.00","detail":"Arrives in 5-7 days","identifier":"standardShipping"},{"label":"Express Shipping","amount":"10.00","detail":"Arrives in 2-3 days","identifier":"expressShipping"}]'
            data-field-apple-pay-required-billing-contact-fields='["postalAddress","name"]'
            data-field-apple-pay-required-shipping-contact-fields='["postalAddress","name"]'
            data-field-apple-pay-contact-fields='["phone","email"]'
            data-field-apple-pay-contact-fields-mapped-to='shipping'
            data-field-apple-pay-line-items='[{"label":"Foobar","amount":"3.00"},{"label":"Arbitrary Line Item #2","amount":"1.00"}]'
            data-field-apple-pay-total-label='foobar'
            data-field-apple-pay-type='buy'
            data-field-apple-pay-style-button-style='black'
            data-field-apple-pay-style-height='40px'
            data-field-apple-pay-style-border-radius='4px'
        ></script>
    </head>
    <body>
        <h1>CollectJS Payment Form</h1>
        <form action="/your-page.php" method="post">
            <table>
                <tr>
                    <td>First Name</td>
                    <td><input size="30" type="text" name="fname" value="Test" /></td>
                </tr>
                <tr>
                    <td>Last Name</td>
                    <td><input size="30" type="text" name="lname" value="User" /></td>
                </tr>
                <tr>
                    <td>Address</td>
                    <td><input size="30" type="text" name="address" value="123 Main Street"></td>
                </tr>
                <tr>
                    <td>City</td>
                    <td><input size="30" type="text" name="city" value="Beverley Hills"></td>
                </tr>
                <tr>
                    <td>State</td>
                    <td><input size="30" type="text" name="state" value="CA"></td>
                </tr>
                <tr>
                    <td>Zip</td>
                    <td><input size="30" type="text" name="zip" value="90210"></td>
                </tr>
                <tr>
                    <td>Country</td>
                    <td><input size="30" type="text" name="country" value="US"></td>
                </tr>
                <tr>
                    <td>Phone</td>
                    <td><input size="30" type="text" name="phone" value="5555555555"></td>
                </tr>
                <tr>
                    <td></td>
                    <td>
                        <div id="googlepaybutton"></div>
                    </td>
                </tr>
                <tr>
                    <td></td>
                    <td>
                        <div id="applepaybutton"></div>
                    </td>
                </tr>

            </table>
            <br>
            <button class="customPayButton" type="button">Pay the money.</button>
        </form>
    </body>
</html>


```

# Advanced JavaScript Lightbox Example

```xml

<html>
    <head>
        <script src="https://secure.easypaydirectgateway.com/token/Collect.js" data-tokenization-key="your-token-key-here"></script>
        <script>
            document.addEventListener('DOMContentLoaded', function () {
                CollectJS.configure({
                    'paymentSelector' : '#customPayButton',
                    'theme': 'bootstrap',
                    'primaryColor': '#ff288d',
                    'secondaryColor': '#ffe200',
                    'buttonText': 'SUBMIT ME!',
                    'instructionText': 'Enter Card Info Below',
                    'paymentType': 'cc',
                    'fields': {
                         'cvv': {
                             'display':'hide'
                         },
                         'googlePay': {
                             'selector': '.googlePayButton',
                             'shippingAddressRequired': true,
                             'shippingAddressParameters': {
                                 'phoneNumberRequired': true,
                                 'allowedCountryCodes': ['US', 'CA']
                             },
                             'billingAddressRequired': true,
                             'billingAddressParameters': {
                                 'phoneNumberRequired': true,
                                 'format': 'MIN'
                             },
                             'emailRequired': true,
                             "buttonType": "buy",
                             "buttonColor": "default",
                             "buttonLocale": "en"
                        },
                        'applePay' : {
                            'selector' : '.applePayButton',
                            'shippingMethods': [\
                                {\
                                    'label': 'Free Standard Shipping',\
                                    'amount': '0.00',\
                                    'detail': 'Arrives in 5-7 days',\
                                    'identifier': 'standardShipping'\
                                },\
                                {\
                                    'label': 'Express Shipping',\
                                    'amount': '10.00',\
                                    'detail': 'Arrives in 2-3 days',\
                                    'identifier': 'expressShipping'\
                                }\
                            ],
                            'shippingType': 'delivery',
                            'requiredBillingContactFields': [\
                                'postalAddress',\
                                'name'\
                            ],
                            'requiredShippingContactFields': [\
                                'postalAddress',\
                                'name'\
                            ],
                            'contactFields': [\
                                'phone',\
                                'email'\
                            ],
                            'contactFieldsMappedTo': 'shipping',
                            'lineItems': [\
                                {\
                                    'label': 'Foobar',\
                                    'amount': '3.00'\
                                },\
                                {\
                                    'label': 'Arbitrary Line Item #2',\
                                    'amount': '1.00'\
                                }\
                            ],
                            'totalLabel': 'foobar',
                            'totalType': 'pending',
                            'type': 'buy',
                            'style': {
                                'button-style': 'white-outline',
                                'height': '50px',
                                'border-radius': '0'
                            }
                        }
                    },
                    'price': '1.00',
                    'currency':'USD',
                    'country': 'US',
                    'callback' : function(response) {
                        alert(response.token);
                        var input = document.createElement("input");
                        input.type = "hidden";
                        input.name = "payment_token";
                        input.value = response.token;
                        var form = document.getElementsByTagName("form")[0];
                        form.appendChild(input);
                        form.submit();
                    }
                });
            });
        </script>
    </head>
    <body>
        <h1>CollectJS Payment Form</h1>
        <form action="/your-page.php" method="post">
            <table>
                <tr>
                    <td>First Name</td>
                    <td><input size="30" type="text" name="fname" value="Test" /></td>
                </tr>
                <tr>
                    <td>Last Name</td>
                    <td><input size="30" type="text" name="lname" value="User" /></td>
                </tr>
                <tr>
                    <td>Address</td>
                    <td><input size="30" type="text" name="address" value="123 Main Street"></td>
                </tr>
                <tr>
                    <td>City</td>
                    <td><input size="30" type="text" name="city" value="Beverley Hills"></td>
                </tr>
                <tr>
                    <td>State</td>
                    <td><input size="30" type="text" name="state" value="CA"></td>
                </tr>
                <tr>
                    <td>Zip</td>
                    <td><input size="30" type="text" name="zip" value="90210"></td>
                </tr>
                <tr>
                    <td>Country</td>
                    <td><input size="30" type="text" name="country" value="US"></td>
                </tr>
                <tr>
                    <td>Phone</td>
                    <td><input size="30" type="text" name="phone" value="5555555555"></td>
                </tr>
                <tr>
                    <td></td>
                    <td>
                        <div class="googlePayButton">
                    </td>
                </tr>
                <tr>
                    <td></td>
                    <td>
                        <div class="applePayButton">
                    </td>
                </tr>
            </table>
            <br>
            <button id="customPayButton" type="button">Submit Payment</button>
        </form>
    </body>
</html>


```

# Expert Lightbox Example

```xml

<html>
    <head>
        <script src="https://secure.easypaydirectgateway.com/token/Collect.js" data-tokenization-key="your-token-key-here"></script>
        <script>
            document.addEventListener('DOMContentLoaded', function () {
                CollectJS.configure({
                    'paymentSelector' : '#customPayButton',
                    'theme': 'bootstrap',
                    'primaryColor': '#ff288d',
                    'secondaryColor': '#ffe200',
                    'buttonText': 'SUBMIT ME!',
                    'paymentType': 'cc',
                    'fields': {
                        'cvv': {
                            'display': 'hide'
                        },
                        'googlePay': {
                            'selector': '.googlePayButton',
                            'shippingAddressRequired': true,
                            'shippingAddressParameters': {
                                'phoneNumberRequired': true,
                                'allowedCountryCodes': ['US', 'CA']
                            },
                            'billingAddressRequired': true,
                            'billingAddressParameters': {
                                'phoneNumberRequired': true,
                                'format': 'MIN'
                            },
                            'emailRequired': true,
                            'buttonType': 'buy',
                            'buttonColor': 'white',
                            'buttonLocale': 'en'
                        },
                        'applePay' : {
                            'selector' : '.applePayButton',
                            'shippingMethods': [\
                                {\
                                    'label': 'Free Standard Shipping',\
                                    'amount': '0.00',\
                                    'detail': 'Arrives in 5-7 days',\
                                    'identifier': 'standardShipping'\
                                },\
                                {\
                                    'label': 'Express Shipping',\
                                    'amount': '10.00',\
                                    'detail': 'Arrives in 2-3 days',\
                                    'identifier': 'expressShipping'\
                                }\
                            ],
                            'shippingType': 'delivery',
                            'requiredBillingContactFields': [\
                                'postalAddress',\
                                'name'\
                            ],
                            'requiredShippingContactFields': [\
                                'postalAddress',\
                                'name'\
                            ],
                            'contactFields': [\
                                'phone',\
                                'email'\
                            ],
                            'contactFieldsMappedTo': 'shipping',
                            'lineItems': [\
                                {\
                                    'label': 'Foobar',\
                                    'amount': '3.00'\
                                },\
                                {\
                                    'label': 'Arbitrary Line Item #2',\
                                    'amount': '1.00'\
                                }\
                            ],
                            'totalLabel': 'foobar',
                            'type': 'buy',
                            'style': {
                                'button-style': 'white-outline',
                                'height': '50px',
                                'border-radius': '0'
                            }
                        }
                    },
                    "price": "1.00",
                    "currency":"USD",
                    "country": "US",
                    'callback' : function(response) {
                        alert(response.token);
                        var input = document.createElement("input");
                        input.type = "hidden";
                        input.name = "payment_token";
                        input.value = response.token;
                        var form = document.getElementsByTagName("form")[0];
                        form.appendChild(input);
                        form.submit();
                    }
                });
            });
        </script>
    </head>
    <body>
        <h1>CollectJS Payment Form</h1>
        <form action="/your-page.php" method="post">
            <table>
                <tr>
                    <td>First Name</td>
                    <td><input size="30" type="text" name="fname" value="Test" /></td>
                </tr>
                <tr>
                    <td>Last Name</td>
                    <td><input size="30" type="text" name="lname" value="User" /></td>
                </tr>
                <tr>
                    <td>Address</td>
                    <td><input size="30" type="text" name="address" value="123 Main Street"></td>
                </tr>
                <tr>
                    <td>City</td>
                    <td><input size="30" type="text" name="city" value="Beverley Hills"></td>
                </tr>
                <tr>
                    <td>State</td>
                    <td><input size="30" type="text" name="state" value="CA"></td>
                </tr>
                <tr>
                    <td>Zip</td>
                    <td><input size="30" type="text" name="zip" value="90210"></td>
                </tr>
                <tr>
                    <td>Country</td>
                    <td><input size="30" type="text" name="country" value="US"></td>
                </tr>
                <tr>
                    <td>Phone</td>
                    <td><input size="30" type="text" name="phone" value="5555555555"></td>
                </tr>
                <tr>
                    <td></td>
                    <td>
                        <div class="googlePayButton">
                    </td>
                </tr>
                <tr>
                    <td></td>
                    <td>
                        <div class="applePayButton">
                    </td>
                </tr>

            </table>
            <br>
                    To show the ability to trigger the form without a click, it will appear automatically after 5 seconds and disappear after another 5.
            <script>
                setTimeout("CollectJS.startPaymentRequest()", 5000);
                setTimeout("CollectJS.closePaymentRequest()", 10000);
            </script>
        </form>
    </body>
</html>


```

# Simple Inline Example

```xml

<html>
    <script src="https://secure.easypaydirectgateway.com/token/Collect.js" data-tokenization-key="your-token-key-here" data-variant="inline"></script>
    <body>
        <h1>CollectJS Payment Form</h1>
        <form action="/your-page.php" method="post">
            <table>
                <tr>
                    <td>First Name</td>
                    <td><input size="30" type="text" name="fname" value="Test" /></td>
                </tr>
                <tr>
                    <td>Last Name</td>
                    <td><input size="30" type="text" name="lname" value="User" /></td>
                </tr>
                <tr>
                    <td>Address</td>
                    <td><input size="30" type="text" name="address" value="123 Main Street"></td>
                </tr>
                <tr>
                    <td>City</td>
                    <td><input size="30" type="text" name="city" value="Beverley Hills"></td>
                </tr>
                <tr>
                    <td>State</td>
                    <td><input size="30" type="text" name="state" value="CA"></td>
                </tr>
                <tr>
                    <td>Zip</td>
                    <td><input size="30" type="text" name="zip" value="90210"></td>
                </tr>
                <tr>
                    <td>Country</td>
                    <td><input size="30" type="text" name="country" value="US"></td>
                </tr>
                <tr>
                    <td>Phone</td>
                    <td><input size="30" type="text" name="phone" value="5555555555"></td>
                </tr>
                <tr>
                    <td colspan="2">
                        Credit Card Information
                    </td>
                </tr>
                <tr>
                    <td>CC Number</td>
                    <td id="ccnumber"></td>
                </tr>
                <tr>
                    <td>CC Exp</td>
                    <td id="ccexp"></td>
                </tr>
                <tr>
                    <td>CVV</td>
                    <td id="cvv"></td>
                </tr>
                <tr>
                    <td colspan="2">
                        Electronic Check Information
                    </td>
                </tr>
                <tr>
                    <td>Account Number</td>
                    <td id="checkaccount"></td>
                </tr>
                <tr>
                    <td>Routing Number</td>
                    <td id="checkaba"></td>
                </tr>
                <tr>
                    <td>Account Owner's Name</td>
                    <td id="checkname"></td>
                </tr>
            </table>
            <br>
            <button id="payButton" type="button">Submit Payment</button>
        </form>
    </body>
</html>


```

# Advanced HTML Inline Example

```xml

<html>
    <head>
        <script
            src="https://secure.easypaydirectgateway.com/token/Collect.js"
            data-tokenization-key="your-token-key-here"
            data-payment-selector="#demoPayButton"
            data-variant="inline"
            data-style-sniffer="false"
            data-google-font="Montserrat:400"
            data-validation-callback = "(function (field, valid, message) {console.log(field + ': ' + valid + ' -- ' + message)})"
            data-custom-css='{
                "background-color": "#a0a0ff",
                "color": "#0000ff"
                }'
            data-invalid-css='{
                "background-color":"red",
                "color":"white"
                }'
            data-valid-css='{
                "background-color":"#d0ffd0",
                "color":"black"
                }'
            data-placeholder-css='{
                "background-color":"#687C8D",
                "color":"green"
            }'
            data-focus-css='{
                "background-color":"#202020",
                "color":"yellow"
            }'
            data-timeout-duration = "10000"
            data-timeout-callback = "(function() {console.log('Timeout reached')})"
            data-apple-pay-recurring-mismatch-callback = "(function() {console.log('Apple Pay version needs to be updated')})"
            data-fields-available-callback = "(function() {console.log('Collect.js has added fields to the form')})"
            data-field-cvv-display = 'required'
             data-field-ccnumber-selector = '#demoCcnumber'
            data-field-ccnumber-title = 'Card Number'
            data-field-ccnumber-placeholder = '0000 0000 0000 0000'
            data-field-ccnumber-enable-card-brand-previews= 'true'
            data-field-ccexp-selector = '#demoCcexp'
            data-field-ccexp-title = 'Expiration Date'
            data-field-ccexp-placeholder = '00 / 00'
            data-field-cvv-display = 'required'
            data-field-cvv-selector = '#demoCvv'
            data-field-cvv-title = 'CVV Code'
            data-field-cvv-placeholder = '***'
            data-field-checkaccount-selector = '#demoCheckaccount'
            data-field-checkaccount-title = 'Account Number'
            data-field-checkaccount-placeholder = '000000000000'
            data-field-checkaba-selector = '#demoCheckaba'
            data-field-checkaba-title = 'Routing Number'
            data-field-checkaba-placeholder = '000000000'
            data-field-checkname-selector = '#demoCheckname'
            data-field-checkname-title = 'Account Name'
            data-field-checkname-placeholder = 'Customer Name'
            data-price="1.00"
            data-currency="USD"
            data-country="US"
            data-field-google-pay-shipping-address-required="true"
            data-field-google-pay-shipping-address-parameters-phone-number-required="true"
            data-field-google-pay-shipping-address-parameters-allowed-country-codes="US,CA"
            data-field-google-pay-billing-address-required="true"
            data-field-google-pay-billing-address-parameters-phone-number-required="true"
            data-field-google-pay-billing-address-parameters-format="MIN"
            data-field-google-pay-email-required="true"
            data-field-google-pay-button-type="buy"
            data-field-google-pay-button-locale="en"
            data-field-google-pay-button-color="default"
            data-field-apple-pay-shipping-type="delivery"
            data-field-apple-pay-shipping-methods='[{"label":"Free Standard Shipping","amount":"0.00","detail":"Arrives in 5-7 days","identifier":"standardShipping"},{"label":"Express Shipping","amount":"10.00","detail":"Arrives in 2-3 days","identifier":"expressShipping"}]'
            data-field-apple-pay-required-billing-contact-fields='["postalAddress","name"]'
            data-field-apple-pay-required-shipping-contact-fields='["postalAddress","name"]'
            data-field-apple-pay-contact-fields='["phone","email"]'
            data-field-apple-pay-contact-fields-mapped-to='shipping'
            data-field-apple-pay-line-items='[{"label":"Foobar","amount":"3.00"},{"label":"Arbitrary Line Item #2","amount":"1.00"}]'
            data-field-apple-pay-total-label='foobar'
            data-field-apple-pay-type='buy'
            data-field-apple-pay-style-button-style='black'
            data-field-apple-pay-style-height='40px'
            data-field-apple-pay-style-border-radius='4px'
        ></script>
        <!-- This style will be inherited by the style-sniffer, with the additions in the configuration -->
        <style>
            input {
                border: 5px inset #687C8D;
                background-color: #c0c0c0;
                color: green;
                font-size: 25px;
                font-family: monospace;
                padding: 5px;
            }
        </style>
    </head>
    <body>
        <h1>CollectJS Payment Form</h1>
        <form action="/your-page.php" method="post">
            <table>
                <tr>
                    <td>Amount: </td>
                    <td><input size="50" type="text" name="amount" value="1.00" /></td>
                </tr>
                <tr>
                    <td>First Name: </td>
                    <td><input size="50" type="text" name="first_name" value="Test" /></td>
                </tr>
                <tr>
                    <td>Last Name: </td>
                    <td><input size="50" type="text" name="last_name" value="User" /></td>
                </tr>
                <tr>
                    <td>Address1</td>
                    <td><input size="50" type="text" name="address1" value="123 Main Street"></td>
                </tr>
                <tr>
                    <td>City</td>
                    <td><input size="50" type="text" name="city" value="Beverley Hills"></td>
                </tr>
                <tr>
                    <td>State</td>
                    <td><input size="50" type="text" name="state" value="CA"></td>
                </tr>
                <tr>
                    <td>zip</td>
                    <td><input size="50" type="text" name="zip" value="90210"></td>
                </tr>
                <tr>
                    <td>country</td>
                    <td><input size="50" type="text" name="country" value="US"></td>
                </tr>
                <tr>
                    <td>phone</td>
                    <td><input size="50" type="text" name="phone" value="5555555555"></td>
                </tr>
                <tr>
                    <td>CC Number</td>
                    <td id="demoCcnumber"></td>
                </tr>
                <tr>
                    <td>CC Exp</td>
                    <td id="demoCcexp"></td>
                </tr>
                <tr>
                    <td>CVV</td>
                    <td id="demoCvv"></td>
                </tr>
                <tr>
                    <td>Account Number</td>
                    <td id="demoCheckaccount"></td>
                </tr>
                <tr>
                    <td>Routing Number</td>
                    <td id="demoCheckaba"></td>
                </tr>
                <tr>
                    <td>Name on Account</td>
                    <td id="demoCheckname"></td>
                </tr>
                <tr>
                    <td></td>
                    <td>
                        <div id="googlepaybutton"></div>
                    </td>
                </tr>
                <tr>
                    <td></td>
                    <td>
                        <div id="applepaybutton"></div>
                    </td>
                </tr>
            </table>
            <br>
            <button id="demoPayButton" type="button">Pay the money.</button>
        </form>
    </body>
</html>



```

# Advanced JavaScript Inline Example

```xml

<html>
    <head>
        <script src="https://secure.easypaydirectgateway.com/token/Collect.js" data-tokenization-key="your-token-key-here"></script>
        <meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, shrink-to-fit=no">
        <style>
            input {
                border: 5px inset #687C8D;
                background-color: #c0c0c0;
                color: green;
                font-size: 25px;
                font-family: monospace;
                padding: 5px;
            }
        </style>
    </head>
    <body>
        <h1>Inline CollectJS Demo</h1>
        <form action="/your-page.php" method="post">
            <table>
                <tr>
                    <td>Amount: </td>
                    <td><input size="50" type="text" name="amount" value="1.00" /></td>
                </tr>
                <tr>
                    <td>First Name: </td>
                    <td><input size="50" type="text" name="first_name" value="Test" /></td>
                </tr>
                <tr>
                    <td>Last Name: </td>
                    <td><input size="50" type="text" name="last_name" value="User" /></td>
                </tr>
                <tr>
                    <td>Address1</td>
                    <td><input size="50" type="text" name="address1" value="123 Main Street"></td>
                </tr>
                <tr>
                    <td>City</td>
                    <td><input size="50" type="text" name="city" value="Beverley Hills"></td>
                </tr>
                <tr>
                    <td>State</td>
                    <td><input size="50" type="text" name="state" value="CA"></td>
                </tr>
                <tr>
                    <td>zip</td>
                    <td><input size="50" type="text" name="zip" value="90210"></td>
                </tr>
                <tr>
                    <td>country</td>
                    <td><input size="50" type="text" name="country" value="US"></td>
                </tr>
                <tr>
                    <td>phone</td>
                    <td><input size="50" type="text" name="phone" value="5555555555"></td>
                </tr>
                <tr>
                    <td>CC Number</td>
                    <td id="demoCcnumber"></td>
                </tr>
                <tr>
                    <td>CC Exp</td>
                    <td id="demoCcexp"></td>
                </tr>
                <tr>
                    <td>CVV</td>
                    <td id="demoCvv"></td>
                </tr>
                <tr>
                    <td>Account Number</td>
                    <td id="demoCheckaccount"></td>
                </tr>
                <tr>
                    <td>Routing Number</td>
                    <td id="demoCheckaba"></td>
                </tr>
                <tr>
                    <td>Name on Account</td>
                    <td id="demoCheckname"></td>
                </tr>
                <tr>
                    <td></td>
                    <td class="googlePayButton"></td>
                </tr>
                <tr>
                    <td></td>
                    <td class="applePayButton"></td>
                </tr>
            </table>
            <br>
            <button id="demoPayButton" type="button">Pay the money.</button>
        </form>
        <script>
            document.addEventListener('DOMContentLoaded', function () {
                CollectJS.configure({
                    "paymentSelector" : "#demoPayButton",
                    "variant" : "inline",
                    "styleSniffer" : "false",
                    "googleFont": "Montserrat:400",
                    "customCss" : {
                        "color": "#0000ff",
                        "background-color": "#d0d0ff"
                    },
                    "invalidCss": {
                        "color": "white",
                        "background-color": "red"
                    },
                    "validCss": {
                        "color": "black",
                        "background-color": "#d0ffd0"
                    },
                    "placeholderCss": {
                        "color": "green",
                        "background-color": "#687C8D"
                    },
                    "focusCss": {
                        "color": "yellow",
                        "background-color": "#202020"
                    },
                    "fields": {
                        "ccnumber": {
                            "selector": "#demoCcnumber",
                            "title": "Card Number",
                            "placeholder": "0000 0000 0000 0000"
                        },
                        "ccexp": {
                            "selector": "#demoCcexp",
                            "title": "Card Expiration",
                            "placeholder": "00 / 00"
                        },
                        "cvv": {
                            "display": "show",
                            "selector": "#demoCvv",
                            "title": "CVV Code",
                            "placeholder": "***"
                        },
                        "checkaccount": {
                            "selector": "#demoCheckaccount",
                            "title": "Account Number",
                            "placeholder": "0000000000"
                        },
                        "checkaba": {
                            "selector": "#demoCheckaba",
                            "title": "Routing Number",
                            "placeholder": "000000000"
                        },
                        "checkname": {
                            "selector": "#demoCheckname",
                            "title": "Name on Checking Account",
                            "placeholder": "Customer McCustomerface"
                        },
                        "googlePay": {
                            "selector": ".googlePayButton",
                            "shippingAddressRequired": true,
                            "shippingAddressParameters": {
                                "phoneNumberRequired": true,
                                "allowedCountryCodes": ['US', 'CA']
                            },
                            "billingAddressRequired": true,
                            "billingAddressParameters": {
                                "phoneNumberRequired": true,
                                "format": "MIN"
                            },
                            'emailRequired': true,
                            "buttonType": "buy",
                            "buttonColor": "white",
                            "buttonLocale": "en"
                        },
                        'applePay' : {
                            'selector' : '.applePayButton',
                            'shippingMethods': [\
                                {\
                                    'label': 'Free Standard Shipping',\
                                    'amount': '0.00',\
                                    'detail': 'Arrives in 5-7 days',\
                                    'identifier': 'standardShipping'\
                                },\
                                {\
                                    'label': 'Express Shipping',\
                                    'amount': '10.00',\
                                    'detail': 'Arrives in 2-3 days',\
                                    'identifier': 'expressShipping'\
                                }\
                            ],
                            'shippingType': 'delivery',
                            'requiredBillingContactFields': [\
                                'postalAddress',\
                                'name'\
                            ],
                            'requiredShippingContactFields': [\
                                'postalAddress',\
                                'name'\
                            ],
                            'contactFields': [\
                                'phone',\
                                'email'\
                            ],
                            'contactFieldsMappedTo': 'shipping',
                            'lineItems': [\
                                {\
                                    'label': 'Foobar',\
                                    'amount': '3.00'\
                                },\
                                {\
                                    'label': 'Arbitrary Line Item #2',\
                                    'amount': '1.00'\
                                }\
                            ],
                            'totalLabel': 'foobar',
                            'totalType': 'pending',
                            'type': 'buy',
                            'style': {
                                'button-style': 'white-outline',
                                'height': '50px',
                                'border-radius': '0'
                            }
                        }
                    },
                    'price': '1.00',
                    'currency':'USD',
                    'country': 'US',
                    'validationCallback' : function(field, status, message) {
                        if (status) {
                            var message = field + " is now OK: " + message;
                        } else {
                            var message = field + " is now Invalid: " + message;
                        }
                        console.log(message);
                    },
                    "timeoutDuration" : 10000,
                    "timeoutCallback" : function () {
                        console.log("The tokenization didn't respond in the expected timeframe.  This could be due to an invalid or incomplete field or poor connectivity");
                    },
                    "fieldsAvailableCallback" : function () {
                        console.log("Collect.js loaded the fields onto the form");
                    },
                    'callback' : function(response) {
                        alert(response.token);
                        var input = document.createElement("input");
                        input.type = "hidden";
                        input.name = "payment_token";
                        input.value = response.token;
                        var form = document.getElementsByTagName("form")[0];
                        form.appendChild(input);
                        form.submit();
                    }
                });
            });
        </script>
    </body>
</html>



```

# Expert Inline Example

```xml

<html>
    <head>
        <script src="https://secure.easypaydirectgateway.com/token/Collect.js" data-tokenization-key="your-token-key-here"></script>
        <script>
            document.addEventListener('DOMContentLoaded', function () {
                CollectJS.configure({
                    'paymentSelector' : '#customPayButton',
                     "fields": {
                        "ccnumber": {
                            "selector": "#demoCcnumber",
                            "title": "Card Number",
                            "placeholder": "0000 0000 0000 0000"
                        },
                        "ccexp": {
                            "selector": "#demoCcexp",
                            "title": "Card Expiration",
                            "placeholder": "00 / 00"
                        },
                        "cvv": {
                            "display": "show",
                            "selector": "#demoCvv",
                            "title": "CVV Code",
                            "placeholder": "***"
                        },
                        "checkaccount": {
                            "selector": "#demoCheckaccount",
                            "title": "Account Number",
                            "placeholder": "0000000000"
                        },
                        "checkaba": {
                            "selector": "#demoCheckaba",
                            "title": "Routing Number",
                            "placeholder": "000000000"
                        },
                        "checkname": {
                            "selector": "#demoCheckname",
                            "title": "Name on Checking Account",
                            "placeholder": "Customer McCustomerface"
                        },
                        "googlePay": {
                            "selector": ".googlePayButton",
                            "shippingAddressRequired": true,
                            "shippingAddressParameters": {
                                "phoneNumberRequired": true,
                                "allowedCountryCodes": ['US', 'CA']
                            },
                            "billingAddressRequired": true,
                            "billingAddressParameters": {
                                "phoneNumberRequired": true,
                                "format": "MIN"
                            },
                            'emailRequired': true,
                            'buttonType': 'buy',
                            'buttonColor': 'white',
                            'buttonLocale': 'en'
                        },
                        'applePay' : {
                            'selector' : '.applePayButton',
                            'shippingMethods': [\
                                {\
                                    'label': 'Free Standard Shipping',\
                                    'amount': '0.00',\
                                    'detail': 'Arrives in 5-7 days',\
                                    'identifier': 'standardShipping'\
                                },\
                                {\
                                    'label': 'Express Shipping',\
                                    'amount': '10.00',\
                                    'detail': 'Arrives in 2-3 days',\
                                    'identifier': 'expressShipping'\
                                }\
                            ],
                            'shippingType': 'delivery',
                            'requiredBillingContactFields': [\
                                'postalAddress',\
                                'name'\
                            ],
                            'requiredShippingContactFields': [\
                                'postalAddress',\
                                'name'\
                            ],
                            'contactFields': [\
                                'phone',\
                                'email'\
                            ],
                            'contactFieldsMappedTo': 'shipping',
                            'lineItems': [\
                                {\
                                    'label': 'Foobar',\
                                    'amount': '3.00'\
                                },\
                                {\
                                    'label': 'Arbitrary Line Item #2',\
                                    'amount': '1.00'\
                                }\
                            ],
                            'totalLabel': 'foobar',
                            'type': 'buy',
                            'style': {
                                'button-style': 'white-outline',
                                'height': '50px',
                                'border-radius': '0'
                            }
                        }
                    },
                    "price": "1.00",
                    "currency":"USD",
                    "country": "US",
                    "variant": "inline",
                    "callback" : function(response) {
                        alert(response.token);
                        var input = document.createElement("input");
                        input.type = "hidden";
                        input.name = "payment_token";
                        input.value = response.token;
                        var form = document.getElementsByTagName("form")[0];
                        form.appendChild(input);
                        form.submit();
                    }
                });
            });
        </script>
    </head>
    <body>
        <h1>CollectJS Payment Form</h1>
        <form action="/your-page.php" method="post">
            <table>
                <tr>
                    <td>First Name</td>
                    <td><input size="30" type="text" name="fname" value="Test" /></td>
                </tr>
                <tr>
                    <td>Last Name</td>
                    <td><input size="30" type="text" name="lname" value="User" /></td>
                </tr>
                <tr>
                    <td>Address</td>
                    <td><input size="30" type="text" name="address" value="123 Main Street"></td>
                </tr>
                <tr>
                    <td>City</td>
                    <td><input size="30" type="text" name="city" value="Beverley Hills"></td>
                </tr>
                <tr>
                    <td>State</td>
                    <td><input size="30" type="text" name="state" value="CA"></td>
                </tr>
                <tr>
                    <td>Zip</td>
                    <td><input size="30" type="text" name="zip" value="90210"></td>
                </tr>
                <tr>
                    <td>Country</td>
                    <td><input size="30" type="text" name="country" value="US"></td>
                </tr>
                <tr>
                    <td>Phone</td>
                    <td><input size="30" type="text" name="phone" value="5555555555"></td>
                </tr>
                <tr>
                    <td>CC Number</td>
                    <td id="demoCcnumber"></td>
                </tr>
                <tr>
                    <td>CC Exp</td>
                    <td id="demoCcexp"></td>
                </tr>
                <tr>
                    <td>CVV</td>
                    <td id="demoCvv"></td>
                </tr>
                <tr>
                    <td>Account Number</td>
                    <td id="demoCheckaccount"></td>
                </tr>
                <tr>
                    <td>Routing Number</td>
                    <td id="demoCheckaba"></td>
                </tr>
                <tr>
                    <td>Name on Account</td>
                    <td id="demoCheckname"></td>
                </tr>
                <tr>
                    <td></td>
                    <td class="googlePayButton"></td>
                </tr>
                <tr>
                    <td></td>
                    <td class="applePayButton"></td>
                </tr>

            </table>
            <br>
                    This form will be automatically submitted after 30 seconds
            <script>
                setTimeout("CollectJS.startPaymentRequest()", 30000);
            </script>
        </form>
    </body>
</html>


```

# Inline Integration Tips and Tricks

The Inline Integration system is powerful and flexible, so we've compiled some hints to help you make the most of it.

## Styling Tips

- If you specify the Style Sniffer option, Collect.js will first create a temporary `INPUT` element in the form at the location you targeted, and measure the styles from that element to model the actual field after. That means you can target individual payment fields via the CSS on your site.

For example, you can add a special green border to just the credit card number field as follows:


```xml

<script
      src="https://secure.easypaydirectgateway.com/token/Collect.js"
      data-tokenization-key="your-token-key-here"
      data-style-sniffer="true"
      data-field-ccnumber-selector = '#myCcnumber'></script>

<style>
      #myCcnumber input {
          border-color: green;
          border-width: 3px;
          border-style: solid;
      }
</style>

<div id="myCcnumber"></div>


```

- Styles provided by the Style Sniffer will be overridden by ones provided in the custom-css paramater, which in turn are overridden by the ones in the invalid-css paramater

- Collect.js lays out its fields on your form with a "width" property of 100%, and a "height" calculated to fit the field as rendered plus provided margins. If you'd like to control the width of the field, or add horizontal space around it, you can specify width and/or padding on the block-level element that the field resides in, allowing the field itself to fill it in horizontally.

- When styling `CollectJSValid` and `CollectJSInvalid` classes in your stylesheet, remember these represent the outer edge of an `iframe` that contains the field. Some CSS rules may not be very visible, or could behave unexpectedly. Body and background colors are unlikely to be visible, but borders and drop shadows are good choices.

- Payment fields have to be retrieved from the Gateway and styled, so you may briefly see a blank space in your page during the loading process. This effect can be mitigated by styling the Collect.js fields to have no border or background, and applying those style components to the `div`, `td`, or other block-level element that contains them instead.


## Integration Tips

- It's generally good practice to only let your customer enter credit card _or_ check information on your payment form. However, Collect.js will allow you to include both credit card and electronic check fields in your form, so you could have a token that has encrypted data for both payment types. If all required fields are present for both payment types, then submitting a transaction in the Payment API with this `payment_token` will process a credit card sale by default, discarding the check data. To use the electronic check data instead, pass the `payment` variable in your Payment API request with the value `check`.

- The `data-google-font` option takes a font string in the same format as you get from the Google Font selection tool. That rool provides a stylesheet link like


```xml

<link href="https://fonts.googleapis.com/css?family=Montserrat:400,700,700i|Roboto:300,400" rel="stylesheet">


```



The section you need is the portion after `family=`. and before the closing quotation mark


```ini

data-google-font="Montserrat:400,700,700i|Roboto:300,400"


```

- If you intend to set up custom handlers for the `blur` or `focus` events, we suggest preparing a `fields-available-callback` function to set them up. That will ensure the events are handled as soon as the Collect.js fields are loaded into the page.

- Defining a custom callback is a great way to integrate Collect.js into an AJAX-based purchase process. When the callback is activated, you can retrieve the payment-token and submit it with the rest of the form. confident that the payment info it represents is at least complete and sensibly formatted.


## Validation Tips

- For a smoother user experience, disable form submission until you have confirmed that the payment fields are successfully stored, as well as any other pre-transaction checks you perform. Collect.js won't let the submission process complete until the payment information is sufficient to run a transaction, which may be surprising if a user tries to submit an incomplete or invalid form.


# Integration Method

Integrating to Collect Checkout is meant to be as simple as possible. The simplest way to integrate is with the button generator in your merchant control panel (coming soon). If you are building your own integration, then here’s a quick setup guide.

## Quick Setup

1. [Create products](https://secure.easypaydirectgateway.com/merchants/product_manager.php?tid=0ad10c2cc375855565ac2c3d7826f4b5) you'll sell through Collect Checkout
2. Set up a "Checkout" security key [in your control panel](https://secure.easypaydirectgateway.com/merchants/options.php?Action=Keys&tid=0ad10c2cc375855565ac2c3d7826f4b5) (under public keys)
3. Add any URLs you will be using for success and cancel URLs to the [Allowlist](https://secure.easypaydirectgateway.com/merchants/collect_checkout.php?Action=Allowlist&tid=0ad10c2cc375855565ac2c3d7826f4b5)
4. Copy, modify, and paste the below code sample to your website

Collect Checkout Tutorial from Gateway Services on Vimeo

![video thumbnail](https://i.vimeocdn.com/video/876191031-794300368901e03d6124f54dd4207d3449ac82c0f04b8994cf4ed0b9ae237b0f-d?mw=80&q=85)

Playing in picture-in-picture

Like

Add to Watch Later

Share

Play

00:00

07:36

Settings

QualityAuto

SpeedNormal

Picture-in-PictureFullscreen

[Watch on Vimeo](https://vimeo.com/405868655?fl=pl&fe=vl)

Once this is complete, you should be able to click the payment button on your website and be redirected to the Collect Checkout cart page.

```xml
<!-- This loads the Collect Checkout JS file. Make sure to use your Checkout key. -->
<script src="https://secure.networkmerchants.com/token/CollectCheckout.js"
        data-checkout-key="checkout_public_12345678901234567890123456789012"></script>

<!-- This is the element on your page that we’re using to trigger Collect Checkout. -->
<button id="checkout_button">Checkout Now</button>

<!--
    You must run CollectCheckout.redirectToCheckout to send the customer to your cart.
    This is using a click on a specific div, but you can make this anything you like.
    All configuration happens in an object passed into redirectToCheckout.
-->
<script>
document.getElementById('checkout_button').addEventListener('click', function (e) {
    CollectCheckout.redirectToCheckout({
        lineItems: [{\
            sku: "0001",\
            quantity: 1\
        }],
        type: "sale",
        collectShippingInfo: true,
        customerVault: {
            addCustomer: true
        },
        successUrl: "https://example.com/receipt/?transid={TRANSACTION_ID}",
        cancelUrl: "https://example.com/",
        receipt: {
            showReceipt: true,
            redirectToSuccessUrl: true
        }
    }).then((error) => {
        console.log(error);
    });
});
</script>
```

A few quick notes on this integration:

- Make sure the checkout key you are using is attached to a user who can run sale and auth transactions.
- Likewise, ensure the user has Customer Vault access to use the add to vault functionality.
- The "checkout\_button" div in this example would be styled by CSS to look like a button. Alternatively, you could use any element on a page, or even use something totally different to trigger the redirectToCheckout function.
- If you 100% must have the customer be redirected to your website after a successful sale, we recommend not showing a receipt. In that case, the sale will approve and the customer will be immediately redirected to your successUrl.
- If you are using Kount, the data collector will be active after enabling the service. No further integration work is necessary for the service to run.

# Reference

## CollectCheckout.redirectToCheckout(options)

The "redirectToCheckout" function requires an object be passed with all the configuration options you are going to use.

| **Variable** | **Type** | **Required?** | **Example** |
| --- | --- | --- | --- |
| lineItems | Array of objects | Yes | ```actionscript<br>lineItems: [{<br>    lineItemType: "purchase",<br>    sku: "0001",<br>    quantity: 1<br>}]<br>```<br>```actionscript<br>lineItems: [{<br>    lineItemType: "customPayment",<br>    description: "My Custom Payment",<br>    currency: "USD"<br>}]<br>``` |
| lineItems.lineItemType | String ("purchase" or "customPayment") | No, defaults to "purchase" |  |
| lineItems.sku | String | Yes, when lineItemType is purchase |  |
| lineItems.quantity | Number | Yes, when lineItemType is purchase |  |
| lineItems.description | String | Yes, when lineItemType is customPayment |  |
| lineItems.currency | String | Yes, when lineItemType is customPayment |  |
| type | String ("sale", "auth", or "customerVaultOnly") | No, defaults to "sale" | ```bash<br>type: "sale"<br>``` |
| collectShippingInfo | Bool | No, defaults to false | ```actionscript<br>collectShippingInfo: true<br>``` |
| customerVault | Object | No | ```actionscript<br>customerVault: {<br>  addCustomer: true<br>}<br>``` |
| customerVault.addCustomer | Bool | No, defaults to false |  |
| useKount | Bool | No, defaults to false<br>**Note: This variable does not work with the cart type "customerVaultOnly".** | ```bash<br>type: "auth"<br>useKount: true<br>```<br>```bash<br>type: "sale"<br>useKount: true<br>```<br>```go<br>type: "customerVaultOnly"<br>//<br>// useKount: true<br>``` |
| successUrl | String | No | ```actionscript<br>successUrl: "https://acme.com/receipt"<br>``` |
| cancelUrl | String | No | ```actionscript<br>cancelUrl: "https://acme.com/shopping"<br>``` |
| receipt | Object | No, defaults to no receipt | ```actionscript<br>receipt: {<br>  showReceipt: true,<br>  redirectToSuccessUrl: true,<br>  sendToCustomer: true<br>}<br>``` |
| receipt.showReceipt | Bool | No, defaults to false |  |
| receipt.redirectToSuccessUrl | Bool | No, defaults to false |  |
| receipt.sendToCustomer | Bool | No, defaults to false |  |

## Line Items

All line items in a button configuration must already exist in the Product Manager in your merchant account. redirectToCheckout will throw an error if you try to pass in SKUs that do not exist. Also be aware of currencies, as you can not create a checkout page with products of differing currencies.

## "Custom Payment" Line Items

If you'd like to allow the customer to pay a custom amount for an item, that can be done by passing in a special line item that enables the customer to specify how much they are paying for an item. Often this will be used with a single item so the customer can make a donation of their chosen amount, but it could be used for anything where you'd like to give the customer the ability to pay what they want for something.

For example, this could be done in lineItems as such:

```actionscript

lineItems: {
  lineItemType: "customPayment",
  description: "Custom Payment Amount",
  currency: "USD"
}
```

This would let the customer specify the price for "Custom Payment Amount" on the Checkout cart page. You can also include fixed price line items as well, but there can only be one "customPayment" item per cart configuration.

## Transaction Type

Collect Checkout defaults to processing sale transactions, but you can perform an auth-only transaction instead by passing in the "type" variable with value "auth". Auth-only transactions will immediately authorize the customer's card, but you will need to capture that transaction outside of Collect Checkout to receive funding.

Alternatively, if you would just like to save a customer to the Customer Vault without running a sale or auth, then you may pass in the value "customerVaultOnly". In this case, please make sure to also send in the "customerVault" object with the action you are performing in the Vault.

## Shipping Information

By default, Collect Checkout will not ask the customer to enter their shipping information. If you need this, it can be collected by passing in the "collectShippingInfo" variable.

## Customer Vault

If you would like to save the customer's payment information in the Customer Vault, then you can provide the "customerVault" object to request it be added upon a successful transaction. A random ID will be assigned to the new Vault ID, and you can receive that value in the successURL as documented below.

## Success URL

This is the URL the customer will be redirected to after completing an approved transaction. This URL must be on the allowlist in your merchant control panel and you can use this value to retrieve the transaction ID and vault ID.

By adding `(TRANSACTION_ID)` in the string, you will receive the gateway transaction ID in its place in the redirect. For example, a successUrl of:

```actionscript
https://example.com/receipt?id=(TRANSACTION_ID)
```

will redirect to:

```actionscript
https://example.com/receipt?id=3453356345
```

In this case, the transaction ID is 3453356345, which you can use to query on the full transaction details.

If adding to the Vault, you may also include `(CUSTOMER_VAULT_ID)` to receive the customer's Vault ID.

| **Variable** | **Description** |
| --- | --- |
| (TRANSACTION\_ID) | The transaction Id for the transaction that was processed |
| (CUSTOMER\_VAULT\_ID) | The Customer Vault ID. |

An important note is that having a customer reach your website with a transaction ID in the URL is not a reliable way to guarantee a transaction was processed, nor that it is not a duplicate transaction (say the customer refreshed the page). We highly recommend using the transaction ID to Query on the transaction information to make sure it belongs to a new transaction on your account before remitting any goods or services.

## Cancel URL

This is the URL the customer will be redirected to if they decide to cancel out of the checkout page. This is done from a "close" button displayed in the Collect Checkout page. Unlike the Success URL, there are not variables that can be passed here since the customer will not have completed a transaction in this case.

## Receipts

By default, Collect Checkout assumes the integrator will display a receipt to the customer, but if you would like Collect Checkout to display a basic receipt to the user, that can be done with the "receipt" object.

"showReceipt" determines whether a receipt is shown on the checkout page. "redirectToSuccessUrl" determines whether that receipt shows a button for the customer to proceed to the success URL.

Note that if you ask the receipt to have the "redirectToSuccessUrl" button, there must be a "successURL" value present as well.

"sendToCustomer" allows you to have an email be sent from the gateway to the customer upon a successful transaction. There will be no email sent by default, but passing this as "true" inside the "receipt" object will send an email receipt to the customer after an approved sale or authorization.

# Collect Checkout

## Overview

![](https://secure.easypaydirectgateway.com/merchants/resources/integration/images/collect_checkout.png)

Collect Checkout is a hosted checkout page that can be integrated into most web-based payment workflows. The checkout page lives entirely on the gateway’s servers, ensuring that no payment data ever touches your environment.

Collect Checkout adheres to all modern web standards and delivers your customers a simple, modern checkout flow with as little friction as possible.

## Customer Path

At a high level, you need to include a little bit of JavaScript on your website where you’d like a customer to be able to click a link/button/image/etc. and be taken to the checkout page. When the customer is redirected to the checkout page they will see a list of products they are paying for, a total amount, and a short form to fill out their payment details. Upon a successful transaction, the customer will be redirected back to your website where you can display a receipt for the transaction.

![](https://secure.easypaydirectgateway.com/merchants/resources/integration/images/collect_checkout_flow.png)

## Collect Checkout vs Collect.js

Choosing Between Collect.js and Collect Checkout from Gateway Services on Vimeo

![video thumbnail](https://i.vimeocdn.com/video/876192089-11b8b041d301b56d0eef0bd162396a451eb2361e4f6bfa424e612939b2352738-d?mw=80&q=85)

Playing in picture-in-picture

Like

Add to Watch Later

Share

Play

00:00

01:00

Settings

QualityAuto

SpeedNormal

Picture-in-PictureFullscreen

[Watch on Vimeo](https://vimeo.com/405869616?fl=pl&fe=vl)

Collect Checkout is similar to [Collect.js](https://secure.easypaydirectgateway.com/merchants/resources/integration/integration_portal.php?tid=0ad10c2cc375855565ac2c3d7826f4b5#cjs_methodology) and in many cases either will be a viable solution for your software. The main deciding factor is going to be how much control you want to have over the checkout process. Both solutions allow you to completely offload sensitive payment data collection to the gateway so you do not have to handle things like credit card numbers.

Collect.js gives you full control over the user journey and every part of the UI. The disadvantage is that to get this control, you need to write all the code for processing transactions, handling errors, and showing receipts.

Collect Checkout gives you less control over the details of the checkout process, since the customer is redirected to a page hosted by the gateway, but the benefit is that you as an integrator have much less to worry about when it comes to transaction processing.

In short, if you want full control over the whole checkout experience, then Collect.js is for you. If you want an easier integration then Collect Checkout is likely the better option.

```
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>


<script src="https://secure.easypaydirectgateway.com/token/CollectCheckout.js" data-checkout-key="checkout_public_Q5R6CGK2D8f7aQ2578rA7694qagKbmyp">
</script>

<body>
  <div class="container">
    <h1>Run a Test Transaction</h1>
    <div id="redirectLink">Start</div>
  </div>
</body>

```

```
.container {
  width: 380px;
  padding: 20px 0 30px 0;
  margin-top: 20px;
  border-radius: 8px;
  box-shadow: 0 3px 20px rgba(0,0,0,0.20);
}

h1 {
  text-align: center;
  font-size: 24px;
}

#redirectLink {
  width: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  border-radius: 4px;
  margin: 20px auto 0 auto;
  height: 40px !important;
  font-size: 20px;
  background-color: #37805B;
  box-shadow: 0 3px 10px rgba(0,0,0,0.20);
  transition: 200ms;
}

#redirectLink:hover {
  background-color: #19C687;
  box-shadow: 0 3px 4px rgba(0,0,0,0.20);
  cursor: pointer;
  transition: 200ms;
}

```

```
document.getElementById('redirectLink').addEventListener('click', function(e) {
    CollectCheckout.redirectToCheckout({
        lineItems : [\
            {\
                sku: "0001",\
                quantity: 2,\
            }\
        ],
        successUrl: "https://secure.safewebservices.com/merchants/resources/integration/examples/collect_checkout/receipt.php",
        cancelUrl: "https://secure.safewebservices.com/merchants/resources/integration/examples/collect_checkout/cancel.php"
    }).then( (error) => {
        console.log(error);
    });
});

```

# Methodology

## Overview

Customer-Present Cloud is a method of processing retail payments using an internet connected terminal without the use of an installed SDK.

Since Cloud terminals do not allow for follow up transactions or use of tokenized payment details, you can use this in conjunction with an existing transaction API (Payment API) to submit follow up transactions (capture, void, refund) or use other gateway services that utilize payment information.

## Choosing between Synchronous and Asynchronous Processing

Understanding the difference and choosing between the two available response styles will decide how you use the API, and whether or not you need to use the AsyncStatus Polling API.

- **Synchronous**: You issue your request and wait for a response from the gateway. Due to the customer interaction with the POI device, the wait time could be up to 5 minutes. You will receive a transaction ID and a final transaction condition in the response and do not need to do any follow up AsyncStatus polling to determine the results of the transaction.  - **Why use it**: Less development, and the API response is identical to a standard Payment API response. Parsing the response, if you already use the Payment API, will be easy.
  - **Caveats**: Due to internet connectivity issues, if you lose internet connectivity while waiting for the API call, you will not receive the API response. This will require you to query the gateway or log into the control panel to see the status of the transaction.
- **Asynchronous**: You issue your request and immediately get a GUID in return. You will then use the AsyncStatus Polling API to determine the state of the transaction and final condition once the customer’s interaction with the POI device is complete.  - **Why use it**: If you want to ensure that your system has a way to query on a transaction while it is in flight, or if you have many devices in the field, this is the better option as it doesn’t require maintaining multiple sessions while a transaction processes. Responses are immediate for the Payment API and the AsyncStatus API.
  - **Caveats**: More development due to the addition of the AsyncStatus API, and the response has minimal detail in it. You may need to use the Query API if you wish to pull back more details about the transaction.

## Steps to register a terminal and process a transaction

**Step 1**: Register your terminal using the current Code value visible on an internet-connected device.

**Step 2**: Process payments with your terminal using the returned POI Device ID. If you are using the synchronous method of processing, you will receive a transaction ID and the final condition of the transaction in the standard Payment API format.
See Step 3 if you are using the asynchronous method of processing.

**Step 3 (for Async users only)**: If you choose to process using the asynchronous method, you will have received a GUID in the response of Step 2. You will use this GUID to poll for the transaction and terminal status until the customer interaction has completed. The final results of the polling will return the final condition and transaction status.

## Usage

Cloud terminals, referred to hereafter as a POI Device, must either be plugged into an ethernet port or connected to a WiFi network with internet access. Once the device has an internet connection, it will immediately try to connect to the platform and start rotating through registration codes.

Once your POI Device is registered, you can begin taking payments on it.

## Authentication

Authentication is done via a "security key" that you can generate in your merchant control panel under the "Security Keys" settings page. Select "API" for the key type.

This security key can be used with most other APIs (Payment, Three-Step, Query) except for Collect.js. You can use an existing API key that has the proper source selected (API.)

![](<Base64-Image-Removed>)

## Testing credentials

Transactions can be tested using one of two methods. First, transactions can be submitted to any merchant account that is in test mode if you have a staging terminal in hand. Keep in mind that if an account is in test mode, valid credit cards will be approved but **no charges will actually be processed.**

The Payment Gateway demo account can also be used for testing transactions at any time but does not support querying for security reasons. Please use the following security key for testing with this account if you do not wish to use (or do not have) your own account:

|     |     |
| --- | --- |
| security\_key: | 2F822Rw39fx762MaV7Yy86jXGTC7sCDy |

# Quick Setup Guide

1. **Your Gateway Account**: Ensure that you have a supported processor on your gateway account if you are using a _live_ account. Supported processors are listed below:
2. **Supported Processors**:


   - TSYS - EMV
   - Chase Paymentech NetConnect Tampa - EMV
   - Elavon - EMV
   - First Data Rapid Connect Cardnet North - EMV
   - First Data Rapid Connect Nashville - EMV
   - First Data Rapid Connect Nashville North - EMV
   - First Data Rapid Connect Omaha - EMV
   - Vantiv Core Host Capture - EMV
   - First Data APACS UK/EU - EMV
   - American Express Direct UK/EU - EMV
   - Worldpay APACS UK/EU - EMV
   - Elavon EISOP UK/EU - EMV
   - AIBMS APACS UK/EU - EMV
   - Barclaycard HISO UK/EU - EMV

Your gateway account should _not_ be in test mode in order to connect to the Cloud with a production POI Device. If you have a 'Staging' device, you MUST be in Test Mode or be using a Test Account.

Contact your account provider to order a POI Device.

3. **Create an API Key in your Gateway Account**: Since using a Cloud enabled POI Device does not allow username/password usage, you must create an API key and use the documented 'security\_key' parameter via API. Log into your account and, if you have Administrative access to the account, you should be able to click on 'Options' and then ' [Security Keys](https://secure.easypaydirectgateway.com/merchants/options.php?Action=Keys&tid=0ad10c2cc375855565ac2c3d7826f4b5)' to access the correct page. You may also click on 'Settings' in the upper right and choose 'Security Keys' from the dropdown. If you do not have Admin access to your account, please contact an Administrator for your account to assist with this step.

    Once you're on the Security Keys page, you should create a 'Private' Security Key by following the below steps:


1. Click 'Add a New Private Key'
2. Enter in the Key "Name" - this is a nickname and can be anything you want.
3. Choose the 'Username' to associate with this key. This username will control what permissions the API key has access to including transaction types, processors, and services such as the Customer Vault, APIs, and so on.
4. Choose 'API' as the Key Permission.
5. Click 'Create'.

Your new Security Key for registration, deregistration, estate management, and processing is now available in the list of Private Security Keys. You will use the value listed under 'Key', and can ignore the value under 'Key ID'.

4. **Connecting your POI Device to the internet**: If you are connecting an ethernet device: Give your POI Device power and internet connectivity via the power adapter and ethernet cord that comes with the device. The ethernet port you connect the device to must have open internet access. If you are connecting a WiFi device: Power on the device and follow device specific instructions to connect it to a WiFi network. If your device does not display "Unregistered" with a rotating "Code" value upon bootup, it is likely that the network you are connecting to is somehow blocking outside access to the internet. You will need to speak with your IT/Network administrator to open up firewalls/allow access for the device to connect to the Customer Present Cloud endpoints.

You're now ready to register your POI device and start processing! Follow the [Device ManagementRegistration and Deregistration](https://secure.easypaydirectgateway.com/gw/merchants/resources/integration/integration_portal.php#cloud_device_management) documentation to start using your device.

## Device Tips

When a Miura M020/21 is connected to Customer Present Cloud it will show either "Unregistered" with a rotating "Code" value, or if it is registered it will show the device’s serial number and its nickname. When the device is in this connected state but idle it is possible to quickly double press the red cancel button which will perform one of two actions: If the device has a power source then the device will disconnect from the platform. If the device is running on battery power then it will go to sleep. A single press of the green accept button will tell the device to wake up from sleep (if it is in the sleep state) and reconnect to the platform.

# Device Management API

## Registration

Before you can use a Customer-Present Cloud POI Device, you must register it to your gateway account using an API key. Doing this will return a device GUID that you can use to process payments using the POI Device.

## Deregistration

When you no longer wish to use your POI Device, or need to use it with a different gateway account, you must deregister it.

## Endpoint

```ruby
https://secure.easypaydirectgateway.com/api/v2/devices/register
```

## Headers

Every API request must be authenticated using HTTP Bearer Authentication header and include a Content-Type header.

```http
Authorization: Bearer {MERCHANT_API_KEY}
Content-Type: application/json
```

## Device Registration

In this request, if the registration code is valid, the device will be registered and a POI device GUID will be returned.

```objectivec
POST /api/v2/devices/register
```

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| registrationCode | string | yes | The value that appears on an internet-connected device when it is not yet registered or has been deregistered. |
| deviceNickname | string | no | When sent will appear on the POI Device screen and in the UI License Manager, as well as in Estate Management queries. |

Example Request

```bash
curl --request POST \
--header "Authorization: Bearer {MERCHANT_API_KEY} " \
--header "Content-Type: application/json" \
-d '{"registrationCode":"8AVJWV","deviceNickname":"My POI Device"}' \
"https://secure.easypaydirectgateway.com/api/v2/devices/register"
```

Example Response

```json
{
    "poiDevice": {
        "poiDeviceId":"414b0420-b31c-4c76-9fc3-8a4f1a6dcffc",
        "deviceNickname":"My POI Device",
        "deviceLicense":"414b0420-b31c-4c76-9fc3-8a4f1a6dcffc",
        "serialNumber":"3375191PT103344",
        "registrationStatus":"registered"
    }
}
```

Response Details

- poiDeviceId

The POI device id that was returned in the register response.

- deviceNickname
The device nickname provided in the request.

- deviceLicense
The device license. In most cases this will be the same as poiDeviceId

- serialNumber
The serial number of the device. This will never change and is a good tracking system for devices.

- registrationStatus
The registration status of the device. This will always be "registered" for a registration response.


## Device Deregistration

In this request, if the POI device ID is valid, the deregistration will be successful and the POI device will be returned to an unregistered state.

```coffeescript
DELETE /api/v2/devices/deregister/:poiDeviceId
```

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| poiDeviceId | string | yes | The device id returned back as poiDeviceId in the register response. |

Example Request

```bash
curl --request DELETE \
--header "Authorization: Bearer {MERCHANT_API_KEY}" \
"https://secure.easypaydirectgateway.com/api/v2/devices/deregister/d352da6e-8772-4433-92f6-a77c4926fd80"
```

Example Response

```json
{
    "registrationStatus":"deregistered"
}
```

## Update Device Nickname

This will allow for the Device Nickname to be updated without deregistration.

```coffeescript
POST /api/v2/devices/update/:poiDeviceId
```

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| deviceNickname | string | yes | This will appear on the POI Device screen and in the UI License Manager, as well as in Estate Management queries. This value can be empty. <br> Value must match expression: ^\[A-Za-z0-9-\_ \]{0,20}$ |

Example Request

```bash
curl --request POST \
--header "Authorization: Bearer {MERCHANT_API_KEY} " \
--header "Content-Type: application/json" \
-d '{"deviceNickname":"My new name"}' \
"https://secure.easypaydirectgateway.com/api/v2/devices/update/414b0420-b31c-4c76-9fc3-8a4f1a6dcffc"
```

Example Response

```json
{
  "success": true,
}
```

# Device Estate Management

When you need information on a specific POI device, or all devices associated with your gateway account, you can run a basic query against your entire estate or target a POI Device ID to get information such as the POI Device ID value, the current nickname, dates registered and deregistered, last date used, and more.

## Endpoint

```ruby
https://secure.easypaydirectgateway.com/api/v2/devices/list
```

## Headers

Every API request must be authenticated using HTTP Bearer Authentication header and include a Content-Type header.

```http
Authorization: Bearer {MERCHANT_API_KEY}
Content-Type: application/json
```

## Single POI device request

Send the GET request with the POI Device ID and the data for that specific ID will be returned.

Request:

```applescript
GET /api/v2/devices/list/:poiDeviceId
```

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| poiDeviceId | string | yes | The POI device ID value that was returned back in the original registration response. |

Example Request

```bash
curl --request GET \
--header "Authorization: Bearer {MERCHANT_API_KEY}" \
"https://secure.easypaydirectgateway.com/api/v2/devices/list/d352da6e-8772-4433-92f6-a77c4926fd80"
```

Example Response

```json
{
    "poiDevices": [\
        {\
            "deviceId": "fc572cda-ae8e-4f21-aa53-d2905c30d696",\
            "make": "ingenico",\
            "model": "IPP320",\
            "lastTransactionDate": "2019-11-22 05:52:08",\
            "dateRegistered": "2019-11-21 20:50:08",\
            "dateDeregistered": null,\
            "serialNumber": "3375191PT103342",\
            "connectionStatus": "connected",\
            "lastConnectedDate": "2020-01-10 15:52:42",\
            "lastDisconnectedDate": null,\
            "deviceNickname": "My POI Device",\
            "registrationStatus": "registered"\
        }\
    ]
}
```

## Additional POI Device information

Send a GET request to the endpoint with a **currentStatus** parameter set to **true** to receive extra information about a device. For supported devices it will return information about the device's Wi-Fi connection or its battery charge status.

Wi-Fi information is only returned for Miura devices. Battery information is returned for Ingenico Link 2500 devices and Miura devices. **Note:** when connected to a power source, Miura devices will return one of three percentage values: 30%, 70% and 100%.

These Wi-FI and battery values are cached for a short period of time, so subsequent queries may result in the same value returned. Data will not be available if a device is performing a transaction.

```ruby
GET /api/v2/devices/list/:poiDeviceId?currentStatus=true
```

Example Request

```bash
curl --request GET \
--header "Authorization: Bearer {MERCHANT_API_KEY}" \
"https://secure.easypaydirectgateway.com/api/v2/devices/list/d352da6e-8772-4433-92f6-a77c4926fd80?currentStatus=true"
```

Example Response

```json
{
    "poiDevices": [\
        {\
            "deviceId": "d352da6e-8772-4433-92f6-a77c4926fd80",\
            "make": "miura",\
            "model": "M021",\
            "lastTransactionDate": "2019-11-22 05:52:08",\
            "dateRegistered": "2019-11-21 20:50:08",\
            "dateDeregistered": null,\
            "serialNumber": "3375191PT103342",\
            "connectionStatus": "connected",\
            "lastConnectedDate": "2020-01-10 15:52:42",\
            "lastDisconnectedDate": null,\
            "deviceNickname": "My POI Device",\
            "registrationStatus": "registered",\
            "batteryInfo": {\
                "percent": 100,\
                "chargingStatus": true\
            },\
            "wifiInfo": {\
                "status": "Connected",\
                "ssid": "MYSSID",\
                "internalIp": "192.168.1.100",\
                "strength": 100,\
                "responseStatus": "ok"\
            }\
        }\
    ]
}
```

## All POI Devices associated with an account

Send a GET request to the endpoint without a POI Device ID indicated.

```applescript
GET /api/v2/devices/list
```

Example Request

```bash
curl --header "Authorization: Bearer {MERCHANT_API_KEY}"
            "https://secure.easypaydirectgateway.com/api/v2/devices/list"
```

Example Response

```json
{
    "poiDevices": [\
        {\
            "deviceId": "fc572cda-ae8e-4f21-aa53-d2905c30d696",\
            "make": "ingenico",\
            "model": "IPP320",\
            "lastTransactionDate": "2019-11-22 05:52:08",\
            "dateRegistered": "2019-11-21 20:50:08",\
            "dateDeregistered": null,\
            "serialNumber": "3629940PT696190",\
            "connectionStatus": "connected",\
            "lastConnectedDate": "2020-01-10 15:52:42",\
            "lastDisconnectedDate": null,\
            "deviceNickname": "My POI Device",\
            "registrationStatus": "registered"\
        },\
        {\
            "deviceId": "73c3791a-e619-4d9d-a687-913ceb9721fa",\
            "make": "ingenico",\
            "model": "IPP320",\
            "lastTransactionDate": "2019-11-22 05:52:08",\
            "dateRegistered": "2019-11-21 20:50:08",\
            "dateDeregistered": "2019-11-22 20:50:08",\
            "serialNumber": "3375191PT103344",\
            "connectionStatus": "disconnected",\
            "lastConnectedDate": "2020-01-10 15:52:42",\
            "lastDisconnectedDate": "2020-01-11 15:52:42",\
            "deviceNickname": "My POI Device",\
            "registrationStatus": "deregistered"\
        },\
        ...\
    ]
}
```

## POI Devices list associated with an account

Send a GET request to the endpoint without a POI Device ID indicated including **disableConnectionInfo** paramter with a value of **true**. This will allow for a faster response when the account has multiple devices while connection details will be omitted.

```applescript
GET /api/v2/devices/list?disableConnectionInfo=true
```

Example Request

```bash
curl --header "Authorization: Bearer {MERCHANT_API_KEY}"
            "https://secure.easypaydirectgateway.com/api/v2/devices/list?disableConnectionInfo=true"
```

Example Response

```json
{
    "poiDevices": [\
        {\
            "deviceId": "fc572cda-ae8e-4f21-aa53-d2905c30d696",\
            "make": "ingenico",\
            "model": "IPP320",\
            "lastTransactionDate": null,\
            "dateRegistered": "2019-11-21 20:50:08",\
            "dateDeregistered": null,\
            "serialNumber": "3629940PT696190",\
            "connectionStatus": null,\
            "lastConnectedDate": null,\
            "lastDisconnectedDate": null,\
            "deviceNickname": "My POI Device",\
            "registrationStatus": "registered"\
        },\
        {\
            "deviceId": "73c3791a-e619-4d9d-a687-913ceb9721fa",\
            "make": "ingenico",\
            "model": "IPP320",\
            "lastTransactionDate": "2019-11-22 05:52:08",\
            "dateRegistered": "2019-11-21 20:50:08",\
            "dateDeregistered": "2020-01-11 15:52:42",\
            "serialNumber": "3375191PT103344",\
            "connectionStatus": null,\
            "lastConnectedDate": null,\
            "lastDisconnectedDate": null,\
            "deviceNickname": "My POI Device",\
            "registrationStatus": "deregistered"\
        },\
        ...\
    ]
}
```

## Error Handling

If successful, the response HTTP status code is **200 OK**.

The following HTTP status codes will be returned in the event of various errors:

- **400** \- No Platform ID or no API Key was sent in the request.
- **401** \- An invalid API Key was sent in the request.

See [Error Recover Tips](https://secure.easypaydirectgateway.com/gw/merchants/resources/integration/integration_portal.php#cloud_error_recovery_tips) for common errors and ways to resolve them.

Response Details

- errorsarray

An array of error objects describing what went wrong

- errors\[0\].code
The gateway response codes - see further documentation [here](https://secure.easypaydirectgateway.com/gw/merchants/resources/integration/integration_portal.php#dp_appendix_3).

- errors\[0\].refid
A specific error id that can be used for troubleshooting with technical support if necessary.

- errors\[0\].message
A specific message associated with this error. Use the error recovery tips to move past these errors or contact support if necessary.


Example Error

```json
{
    "errors": [\
        {\
            "code": 300,\
            "refid": 12345,\
            "message": "Message describing the error"\
        },\
        ...\
    ]
}
```

# Processing

## Card Charges (Sale & Auth)

To charge a credit or debit card, you will process a sale or an auth transaction. You can follow these transaction types up with a capture (to allow an auth to settle), a void (to cancel a sale or an auth), or a refund (to reverse a sale or a captured auth.) You can add to the Customer Vault using this transaction type to store payment data while charging a card.

## Card Validation

You can also check the validity of a card by processing a validate transaction. This will process a 0.00 transaction against the card details provided. You can add to the Customer Vault using this transaction type to store payment data without charging a card.

## Unlinked Credits

If you need to return funds to a customer and do not have an original transaction with which to process a refund, or the customer does not have the original card, you can process an unlinked credit.

## Response Style Selection

The response style represents which method you wish to receive responses from the gateway, and will decide whether or not you use the AsyncStatus polling API. There are two options:

- **Synchronous**: You issue your request and wait for a response from the gateway. Due to the customer interaction with the POI device, this could be up to 5 minutes. The transaction will time out after 300 seconds and will need to be restarted. You will receive a transaction ID and a final transaction condition in the response and do not need to do any follow up AsyncStatus polling to determine the results of the transaction.
- **Asynchronous**: You issue your request and immediately get a GUID in return. You will then use the AsyncStatus Polling API to determine the state of the transaction and final condition with that GUID. This will provide you with the response of the customer's interaction with the POI device once it is complete.
  - Related Documentation: [AsyncStatus API](https://secure.easypaydirectgateway.com/gw/merchants/resources/integration/integration_portal.php#cloud_asyncstatus)

## Endpoint

```actionscript
https://secure.easypaydirectgateway.com/api/transact.php
```

## Headers and Request Data Format

The Payment API accepts either **multipart/form-data** or **application/x-www-form-urlencoded**. Depending on which format is used, the **Content-Type** header should be set to the correct value.


## Transaction Processing

```undefined
POST /api/transact.php
```

Request Details

| Variable Name | Description |
| --- | --- |
| security\_key\* | API Security Key assigned to a merchant account. New keys can be generated from the merchant control panel in Settings > Security Keys. <br>**Note**: Using the 'username' and 'password' variables in the request will result in an error. |
| poi\_device\_id\* | The registered terminal ID. Provide on transaction types of sale, auth, credit and validate. |
| response\_method | The type of response you wish to see returned. Set to ' **synchronous**' to wait for a final transaction ID. Set to ' **asynchronous**' to receive an async\_status\_guid value to poll against. <br> Default: 'synchronous' <br> Values: 'synchronous' or 'asynchronous' <br>**Note**: You must use the [AsyncStatus API](https://secure.easypaydirectgateway.com/gw/merchants/resources/integration/integration_portal.php#cloud_asyncstatus) if you use 'asynchronous' processing. Please see 'Response Style Selection' above for more information. You can see an example of the response you'll get in the examples below. |
| type | The type of transaction to be processed. <br> Values: 'sale', 'auth', 'credit', or 'validate' |
| amount | Total amount to be charged. For validate, the amount must be omitted or set to 0.00. <br> Format: x.xx |
| first\_name | Cardholder's first name. |
| last\_name | Cardholder's last name. |
| company | Cardholder's company. |
| address1 | Card billing address. |
| address2 | Card billing address, line 2. |
| city | Card billing city. |
| state | Card billing state. <br> Format: CC |
| zip | Card billing zip code. |
| country | Card billing country. Country codes are as shown in ISO 3166. Format: CC |
| phone | Billing phone number. |
| email | Billing email address. |
| order\_description | Order description. |
| orderid | Order Id. |
| ponumber | Original purchase order. |
| tax | The sales tax, included in the transaction amount, associated with the purchase. <br> Format: x.xx |
| merchant\_defined\_field\_# | You can pass custom information in up to 20 fields. <br> Format: merchant\_defined\_field\_1=Value |
| customer\_vault | Associate payment information with a Customer Vault record if the transaction is successful. <br> Values: 'add\_customer' or 'update\_customer' |
| customer\_vault\_id | Specifies a Customer Vault id. If not set, the payment gateway will randomly generate a Customer Vault id. |
| processor\_id | If using Multiple MIDs, route to this processor (processor\_id is obtained under Settings->Transaction Routing in the Control Panel). |

Request dynamic descriptor details If supplied, these dynamic descriptor values may be used to override the merchant's default descriptor values for this transaction. Depending on the rules of the merchant processor used for the transaction, dynamic descriptor values may be used on the cardholder's billing/bank statement as a part of the description of the transaction.

| Variable Name | Description |
| --- | --- |
| descriptor | The dynamic descriptor name <br> Value must match expression: ^\[A-Za-z0-9-\_ &\]{0,60}$ |
| descriptor\_phone | The dynamic descriptor phone <br> Value must match expression: ^\[A-Za-z0-9-\_+ \]{0,60}$ |
| descriptor\_address | The dynamic descriptor address <br> Value must match expression: ^\[A-Za-z0-9-\_,\\' \]{0,60}$ |
| descriptor\_city | The dynamic descriptor city <br> Value must match expression: ^\[A-Za-z0-9-\_ \]{0,60}$ |
| descriptor\_state | The dynamic descriptor state <br> Value must match expression: ^\[A-Za-z0-9-\_ \]{0,60}$ |
| descriptor\_postal | The dynamic descriptor postal code <br> Value must match expression: ^\[A-Za-z0-9-\_ \]{0,60}$ |
| descriptor\_country' | The dynamic descriptor country <br> Value must match expression: ^\[A-Za-z0-9-\_ \]{0,60}$ |
| descriptor\_mcc | The dynamic descriptor merchant category code (MCC) <br> Value must match expression: ^\[0-9\]{0,60}$ |
| descriptor\_merchant\_id | The dynamic descriptor merchant id <br> Value must match expression: ^\[A-Za-z0-9-\_ \]{0,60}$ |
| descriptor\_url | The dynamic descriptor url <br> Value must match expression: ^\[A-Za-z0-9.\*()~$\\'!\\-\_+,\\/&?=:%#\]{0,120}$ |

New Response Details

| Variable Name | Description |
| --- | --- |
| async\_status\_guid\* | Will contain a GUID for use with polling. Will only return dynamically when 'response\_method' is set to 'asynchronous'. Store and use for retrieving the final status of a transaction using the AsyncStatus API. <br> Format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx |
| platform\_id\* | DEPRECATED: Will contain a GUID for use with polling. Will only return dynamically when 'response\_method' is set to 'asynchronous'. Store and use for retrieving the final status of a transaction using the AsyncStatus API. <br> Format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx |
| verification\_method\*\* | A CVM is a means of checking that the user of a card is the genuine cardholder. The returned value will indicate how the customer was verified. <br> Values: 'signature', 'offline\_pin', 'online\_pin', 'offline\_pin\_signature', or 'none' <br>**Note:** A response with the value of 'signature' indicates the signature should be collected and confirmed by the POS operator. |
| transaction\_status\_information\*\* | A collection of indicators that the terminal will set to show what processing steps have been performed on the current transaction (e.g. Cardholder Verification, Data Authentication). Example: E800. |
| emv\_application\_id\*\* | Identifies the EMV application that the terminal used on the transaction as described in ISO/IEC 7816-5. Example: A000000003101001. |
| emv\_application\_label\*\* | The human readable name associated with the AID according to ISO/IEC 7816-5. Example: Visa International. |
| emv\_application\_preferred\_label\*\* | The human readable name associated with the applicationId in the cardholder’s local language. This value will not always be present. |

\\* Only applicable/useful when processing **asynchronous** transactions. Store to poll against using the AsyncStatus API. **Note**: If you are using **synchronous** processing method and you have a custom API response set to include this value, you can safely ignore it and do not need to poll the status API with it.

\\*\\* Additional transaction receipt data returned with EMV/Chip Card transactions.

## Examples:

**Synchronous Sale**: In this request, a transaction ID will be returned and the final state will be returned like a typical Payment API response.

```
...type=sale&poi_device_id=XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
            &response_method=synchronous&amount=1.00&...
```

```
...response=1&responsetext=Approved&authcode=XXXXX&transactionid=XXXXXXXXXX
            &type=sale&response_code=100
```

**Synchronous Sale & Add to Vault**: In this request, a transaction ID and a Customer Vault ID will be returned and the final state will be returned like a typical Payment API response.

```
...type=sale&poi_device_id=XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
            &response_method=synchronous&amount=1.00&customer_vault=add_customer...
```

```
...response=1&responsetext=Approved&authcode=XXXXX&transactionid=XXXXXXXXXX
            &type=sale&response_code=100&customer_vault_id=XXXXXXXXX
```

**Asynchronous Sale**: In this request, a **async\_status\_guid** will be returned that you must poll against using the AsyncStatus API.

```
...type=sale&poi_device_id=XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
            &response_method=asynchronous&amount=1.00&...
```

```
...response=1&responsetext=Request Accepted&...&response_code=101
            &async_status_guid=XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
```

**Asynchronous Sale + Add to Vault**: In this request, a **async\_status\_guid** will be returned that you must poll against using the AsyncStatus API. You will not receive a Vault ID in the initial Payment API call.

```
...type=sale&poi_device_id=XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
            &response_method=asynchronous&amount=1.00&customer_vault=add_customer...
```

```
...response=1&responsetext=Request Accepted&...&response_code=101
            &async_status_guid=XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
```

Since the asynchronous response does not return a transaction ID or the status / condition of the transaction, use the async\_status\_guid value to poll against the terminal itself. See **'AsyncStatus API'** below for documentation.

**Voids / Captures / Refunds**

To void a sale or an auth, capture an auth, or refund a transaction, please follow the documented Payment API methods in a request to your gateway account. You do not need to provide the POI Device ID or response\_method variables as there is no device interaction on these types of transactions.

Examples:

**Void**: In this request, a transaction ID will be returned and the final state will be returned like a typical Payment API response. You do not need to provide the POI Device ID as there is no device interaction on voids.

```
...type=void&transactionid=XXXXXXXXXX...
```

```
response=1&responsetext=Transaction Void Successful&authcode=XXXXXX
            &transactionid=XXXXXXXXXX&type=void&response_code=100
```

**Capture**: In this request, a transaction ID will be returned and the final state will be returned like a typical Payment API response. You do not need to provide the POI Device ID as there is no device interaction on captures. You can specify an amount or not. Not specifying an amount will capture the full amount authorized.

```
...type=capture&transactionid=XXXXXXXXXX&amount=X.XX...
```

```
response=1&responsetext=Transaction Capture Successful&authcode=XXXXXX
            &transactionid=XXXXXXXXXX&type=capture&response_code=100
```

**Refund**: In this request, a transaction ID will be returned and the final state will be returned like a typical Payment API response. You do not need to provide the POI Device ID as there is no device interaction on refunds. You can specify an amount or not. Not specifying an amount will refund the full amount authorized.

```
...type=refund&transactionid=XXXXXXXXXX...
```

```
response=1&responsetext=Approved&authcode=XXXXXX&transactionid=XXXXXXXXXX
            &type=refund&response_code=100
```

# AsyncStatus Polling

If you are integrating to the "asynchronous" version of transaction processing, you will need to use this endpoint to determine whether or not the consumer's interaction with the POI device has completed or not and whether or not the transaction was successful. Using the 'async\_status\_guid' value you received in an asynchronous transaction response, you can send requests and receive a JSON response.

## Endpoint

```actionscript
https://secure.easypaydirectgateway.com/api/asyncstatus
```

## Headers

Every API request must be authenticated using HTTP Bearer Authentication header

```http
Authorization: Bearer {MERCHANT_API_KEY}
```

## Poll against an Asynchronous Transaction

Using the GUID returned in the 'async\_status\_guid' on an asynchronous transaction request, perform a GET to receive back JSON formatted response with the most up to date status of the transaction as the customer is interacting with the POI Device.

```coffeescript
GET /api/asyncstatus/:asyncStatusGuid
```

| Path Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| asyncStatusGuid | string | yes | The async\_status\_guid returned from the transaction response. <br>Example: 04249b3a-02f9-4838-b7b5-2bef4d4e7f7d |
| responseMethod | string | no | The type of response you wish to see returned. Set to<br>' **synchronous**' to wait for a final transaction ID. Set to<br>' **asynchronous**' to receive inFlight async status responses.<br>Default: 'asynchronous'<br> <br>Values: 'synchronous' or 'asynchronous'<br>Example: 'synchronous' |

Example Request without Response Method:

```bash
curl --request GET --header "Authorization: Bearer {MERCHANT_API_KEY}"
            "https://secure.easypaydirectgateway.com/api/asyncstatus/70a6272c-4949-4515-956a-6e5ae4d5a10c"
```

Example Request with Asynchronous Response Method:

```bash
curl --request GET --header "Authorization: Bearer {MERCHANT_API_KEY}"
            "https://secure.easypaydirectgateway.com/api/asyncstatus/70a6272c-4949-4515-956a-6e5ae4d5a10c?responseMethod=asynchronous"
```

Example Response without Response Method/with Asynchronous Response Method:

While the transaction is in progress or 'in flight', the responses will return with little information other than the platform ID and status.

```json
{
   "transaction": {
       "id": null,
       "success": false,
       "condition": "",
       "authCode": ""
   },
   "platformId": "70a6272c-4949-4515-956a-6e5ae4d5a10c",
   "asyncStatusGuid": "70a6272c-4949-4515-956a-6e5ae4d5a10c",
   "asyncStatus": "inFlight"
}
```

Example Request with Synchronous Response Method:

```bash
curl --request GET --header "Authorization: Bearer {MERCHANT_API_KEY}"
            "https://secure.easypaydirectgateway.com/api/asyncstatus/70a6272c-4949-4515-956a-6e5ae4d5a10c?responseMethod=synchronous"
```

Example Response with Synchronous Response Method:

When using a query parameter with the value of 'synchronous', the expected response would include the final transaction details with a asyncStatus of **poiDeviceInUse**, **cancelled**, **cancelledAtTerminal** or **interactionComplete**:

```json
{
   "transaction": {
       "id": 4869813602,
       "type": "sale",
       "success": true,
       "condition": "pendingsettlement",
       "authCode": "A99BUO"
   },
   "platformId": "70a6272c-4949-4515-956a-6e5ae4d5a10c",
   "asyncStatusGuid": "70a6272c-4949-4515-956a-6e5ae4d5a10c",
   "asyncStatus": "interactionComplete"
}
```

**Example responses with and without Response Method:**

If the POI Device has an inFlight transaction with another 'async\_status\_guid', the response for the second transaction requested will return this:

```json
{
    "transaction": {
        "id": null,
        "success": false,
        "condition": "",
        "authCode": ""
    },
    "platformId": "f090f2e5-c96c-eb11-869b-005056b9afb7",
    "asyncStatusGuid": "f090f2e5-c96c-eb11-869b-005056b9afb7",
    "asyncStatus": "poiDeviceInUse"
}
```

In the event of an approval (sale or credit), the response would **change** to this:

```json
{
   "transaction": {
       "id": 4869813602,
       "type": "sale",
       "success": true,
       "condition": "pendingsettlement",
       "authCode": "A99BUO"
   },
   "platformId": "70a6272c-4949-4515-956a-6e5ae4d5a10c",
   "asyncStatusGuid": "70a6272c-4949-4515-956a-6e5ae4d5a10c",
   "asyncStatus": "interactionComplete"
}
```

Note: An 'auth' or 'validate' action would have a different condition. Auths remain in a 'pending' state and require capturing to settle, and Validates are immediately 'complete' upon approval. In the event of a decline, the response would change to this:

```json
{
   "transaction": {
       "id": 4869813602,
       "type": "sale",
       "success": false,
       "condition": "failed",
       "authCode": ""
   },
   "platformId": "70a6272c-4949-4515-956a-6e5ae4d5a10c",
   "asyncStatusGuid": "70a6272c-4949-4515-956a-6e5ae4d5a10c",
   "asyncStatus": "interactionComplete"
}
```

If the transaction is an EMV transaction, the response will include emvMetaData details for creating custom receipts:

```json
{
   "transaction": {
       "id": 4869813602,
       "type": "sale",
       "success": true,
       "condition": "pendingsettlement",
       "authCode": "A99BUO"
       "emvMetaData": {
            "customerVerificationMethod": "signature",
            "applicationId": "A0000000031010",
            "applicationLabel": "VISA CREDIT",
            "applicationPreferredName": "CREDITO DE VISA",
            "applicationPanSequenceNumber": "02",
            "transactionStatusInformation": "E800",
            "maskedMerchantNumber": "xxxxx1111",
            "maskedTerminalNumber": "xxxx1234"
       }
   },
   "platformId": "70a6272c-4949-4515-956a-6e5ae4d5a10c",
   "asyncStatusGuid": "70a6272c-4949-4515-956a-6e5ae4d5a10c",
   "asyncStatus": "interactionComplete"
}
```

Vault details will be returned if specified in the transaction request.

```json
{
    "transaction": {
        "id": "281474978429650",
        "type": "sale",
        "success": true,
        "condition": "pendingsettlement",
        "authCode": "SH14L8",
        "customerVaultId":"9742353903"
    },
    "platformId": "86d84df6-e062-49f6-ba81-4b667839e34e",
    "asyncStatusGuid": "86d84df6-e062-49f6-ba81-4b667839e34e",
    "asyncStatus": "interactionComplete"
}
```

If there was an error it will be in the asyncstatus response.

```json
{
    "transaction": {
        "id": null,
        "success": false,
        "condition": "",
        "authCode": ""
    },
    "error": {
        "code":300,
        "refid":"58523101",
        "message":"error message will appear here"
    },
    "platformId": "dd1c7f5c-13b5-4098-82c1-73d3e1bb085f",
    "asyncStatusGuid": "dd1c7f5c-13b5-4098-82c1-73d3e1bb085f",
    "asyncStatus": "interactionComplete"
}
```

If successful, the response HTTP status code is **200 OK.**

## Errors

The following HTTP status codes will be returned in the event of various errors:

- **300** \- Indicates that an issue occurred whilst trying to get the status of a transaction. This usually happens when a transaction takes more time than usual to be processed. If it keeps re-occurring you should check the device to ensure that it is connected and ready to perform transactions.

- **400** \- No Platform ID or no API Key was sent in the request.

- **401** \- An invalid API Key was sent in the request.

- **404** \- The Platform ID provided was not found.


Response Details

- transactionobject

The transaction object containing a subset of information

- transaction.id
The gateway transaction ID that can be used for querying.

- transaction.success
Will return true or false depending on the final result of the transaction.
  - **true** -indicates a successful transaction (approved)
  - **false**
     \- indicates a failed transaction (declined).

    The response will return false also in the event of an error, a cancelled transaction, or when the customer has not yet finished interacting with the POI Device.
- transaction.condition
The final condition of the transaction.
  - **pendingsettlement** \- for successful Sales and Credits
  - **pending** \- for successful Auths
  - **complete** \- for successful Validates
  - **canceled** \- for voided transactions
  - **failed** \- for declined transactions
- authCode
If the transaction was successful, the auth code will be returned.

- customerVaultId
If the transaction request included Customer Vault parameters, the Customer Vault ID will be returned.

- emvMetaDataobject
If the transaction was an EMV/Chip Card insert, additional transaction receipt data will be returned.

- emvMetaData.customerVerificationMethod
A CVM is a means of checking that the user of a card is the genuine cardholder. The returned value will indicate how the customer was verified.
  - **signature**
     \- The customer either signed digitally or was asked to sign a physical receipt. This CVM indicates the signature should be collected and confirmed by the POS operator.
  - **offlinePin**
     \- The customer entered their pin on the POI Device and it was verified by the chip.
  - **onlinePin**
     \- The customer entered their pin on the POI Device and it was verified by the Card Issuer.
  - **offlinePinSignature**
     \- The customer entered their PIN on the POI Device and they signed digitally or a physical receipt.
  - **none** \- The customer could not be verified by the POI Device.
- emvMetaData.applicationId
Identifies the EMV application that the POI Device used on the transaction as described in ISO/IEC 7816-5. Example: A000000003101001.

- emvMetaData.applicationLabel
The human readable name associated with the AID according to ISO/IEC 7816-5. Example: Visa International.

- emvMetaData.applicationPreferredName
The human readable name associated with the applicationId in the cardholder’s local language. This value will not always be present.

- emvMetaData.transactionStatusInfo
A collection of indicators that the POI Device will set to show what processing steps have been performed on the current transaction (e.g. Cardholder Verification, Data Authentication). Example: E800.

- errorobject
If the transaction experienced an error, the code, refid, and message will be returned.

- error.codeobject
The static error code '300' indicates that an issue occurred whilst trying to get the status of a transaction. This usually happens when a transaction takes more time than usual to be processed. If it keeps re-occurring you should check the device to ensure that it is connected and ready to perform transactions.

- error.refidobject
The unique identification for the error. This value can be provided to support for further troubleshooting.

- error.messageobject
The human readable message describing the issue with the transaction.

- platformId
DEPRECATED: The current GUID being polled against.

- asyncStatusGuid
The current GUID being polled against.

- asyncStatus
The current status of the transaction on the POI Device itself.
  - **inFlight**
     \- This means the customer is still interacting with the POI Device. There may or may not be a transaction created at this point.
  - **poiDeviceInUse**
     \- This means there is a transaction in progress or 'in flight' with the same POI Device using another 'async\_status\_guid'
  - **cancelled**
     \- This means the transaction was cancelled with a general error. No transaction was created.
  - **cancelledAtTerminal**
     \- This means the cancel button on the POI Device was pressed. No transaction was created.
  - **cancelledByApi**
     \- The transaction was cancelled by API request. Please start a new transaction.
  - **cancelledByTimeout**
     \- The transaction was cancelled due to no interaction with the device. Please start a new transaction.
  - **interactionComplete**
     \- This means the transaction has completed, and POI Device interaction has ceased. A new transaction can be started on this device.

# Standalone Device inputs

### Start a standalone device input

It is possible to perform a standalone signature capture on a POI Device outside of a normal transaction flow.

## Headers

Every API request must be authenticated using HTTP Bearer Authentication header and include a Content-Type header.

```http
Authorization: Bearer {MERCHANT_API_KEY}
Content-Type: application/json
```

## Signature

This allows for the capture a customer’s electronic signature. This action is supported by the following devices: Lane 5000, Lane 7000, Miura M021.

Request:

```ruby
GET https://secure.easypaydirectgateway.com/api/v2/devices/sign/:poiDeviceId
```

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| poiDeviceId | string | yes | The POI device ID you want to interact with. |
| header | string | no | The header message displayed on the device. <br>Value must match expression: ^\[a-zA-Z0-9.,?!&\\/#\\'-= \]{0,100}$ |

Example Request

```bash
curl --request GET \
--header "Authorization: Bearer {MERCHANT_API_KEY}" \
"https://secure.easypaydirectgateway.com/api/v2/devices/sign/d352da6e-8772-4433-92f6-a77c4926fd80"
```

Example Response

```json
{
    "async_status_guid": "118d6276-dfd4-4613-acfc-75d22bcdd189",
    "status": "in_progress"
}
```

## Yes/No Prompt

This allows for the capture a customer’s answer to a yes/no question with an on-screen header and optional message. This action is supported by the following devices: Lane 3000, Lane 5000, Lane 7000, Link 2500, Miura M020, Miura M021.

Request:

```ruby
GET https://secure.easypaydirectgateway.com/api/v2/devices/yesno/:poiDeviceId
```

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| poiDeviceId | string | yes | The POI device ID you want to interact with. |
| header | string | no | Header text you want to display on device. <br>Value must match expression: ^\[a-zA-Z0-9.,?!&\\/#\\'-= \]{0,100}$ |
| message | string | no | Message text you want to display on device <br>Value must match expression: ^\[a-zA-Z0-9.,?!&\\/#\\'-= \]{0,100}$ |

Example Request

```bash
curl --request GET \
--header "Authorization: Bearer {MERCHANT_API_KEY}" \
"https://secure.easypaydirectgateway.com/api/v2/devices/yesno/d352da6e-8772-4433-92f6-a77c4926fd80"
```

Example Response

```json
{
    "async_status_guid": "118d6276-dfd4-4613-acfc-75d22bcdd189",
    "status": "in_progress"
}
```

## Multiple Choice Prompt

This allows for the capture a customer’s answer to a multiple choice question with an on-screen header and options. This action is supported by the following devices: Lane 3000, Lane 5000, Lane 7000, Link 2500, Miura M020, Miura M021.

Request:

```ruby
GET https://secure.easypaydirectgateway.com/api/v2/devices/menuselection/:poiDeviceId
```

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| poiDeviceId | string | yes | The POI device ID you want to interact with. |
| header | string | no | Header text you want to display on device. <br>Value must match expression: ^\[a-zA-Z0-9.,?!\\/#&'-= \]{0,24}$ |
| options | array | yes | List of options you want to display on device. A minimum of 2 options are required and there can be a maximum of 20 options. <br>Each option must match expression: ^\[a-zA-Z0-9.,?!\\/#&'-= \]{0,24}$ |

Example Request

```bash
curl --request GET \
--header "Authorization: Bearer {MERCHANT_API_KEY}" \
--header "Content-Type: application/json" \
-d '{"header": "Question", "options": ["opt1", "opt2", "opt3"]}' \
"https://secure.easypaydirectgateway.com/api/v2/devices/menuselection/d352da6e-8772-4433-92f6-a77c4926fd80"
```

Example Response

```json
{
    "async_status_guid": "118d6276-dfd4-4613-acfc-75d22bcdd189",
    "status": "in_progress"
}
```

### Query a standalone device input

In order to query the result of a standalone device input, you will need to use this endpoint to determine whether a customer’s interection with the POI device has completed or not and whether the request was successful. You will need to use the 'async\_status\_guid' value you received in the start standalone input response.

## Endpoint

```ruby
GET https://secure.easypaydirectgateway.com/api/asyncdevicestatus/:asyncStatusGuid
```

## Headers

Every API request must be authenticated using HTTP Bearer Authentication header

```http
Authorization: Bearer {MERCHANT_API_KEY}
```

## Poll against an Asynchronous Device Input

Example Request without Response Method:

```bash
curl --request GET --header "Authorization: Bearer {MERCHANT_API_KEY}"
            "https://secure.easypaydirectgateway.com/api/asyncdevicestatus/70a6272c-4949-4515-956a-6e5ae4d5a10c"
```

Example Request with Asynchronous Response Method:

```bash
curl --request GET --header "Authorization: Bearer {MERCHANT_API_KEY}"
            "https://secure.easypaydirectgateway.com/api/asyncdevicestatus/70a6272c-4949-4515-956a-6e5ae4d5a10c?responseMethod=asynchronous"
```

Example Response without Response Method/with Asynchronous Response Method:

While the request is in progress, the responses will return with only the platform ID and status information.

```json
{
    "reference": "be7e7e60-d3cc-4a67-a8a0-f89dbfb10257",
    "status": "in_progress"
}
```

Example Request with Synchronous Response Method:

```bash
curl --request GET --header "Authorization: Bearer {MERCHANT_API_KEY}"
            "https://secure.easypaydirectgateway.com/api/asyncdevicestatus/70a6272c-4949-4515-956a-6e5ae4d5a10c?responseMethod=synchronous"
```

When using a query parameter with the value of 'synchronous', the expected response would include the final request details with a **status** of **complete**, **cancelled**, **timeout**, **error**, **unsupported\_device** or **formatting\_error**:

Example Request with a successful signature response:

```json
{
    "status": "complete",
    "signature": "iVBORw0 ...",
    "signature_format": "image/png"
}
```

The **signature** field will contain the signature image data encoded as a base64 string.

The **signature\_format** field contains the format of the image. This is currently only set to "image/png".

Example Request with a successful yes/no prompt response:

```json
{
    "reference": "df5ea4b0-05d9-4ddd-ad7b-c1c63857fffd",
    "status": "complete",
    "result": true
}
```

The **result** field will indicate the customer's response to the yes/no question with a boolean value.

Example Request with a successful multiple choice prompt response:

```json
{
    "reference": "df5ea4b0-05d9-4ddd-ad7b-c1c63857fffd",
    "status": "complete",
    "result": 2
}
```

The **result** field will indicate the customer's response to the multiple choice question with the number of the item in the list that was chosen. A **result** of 1 means that the first item in the list was chosen.

## Error Handling

If successful, the response HTTP status code is **200 OK**.

The following HTTP status codes will be returned in the event of various errors:

- **400** \- No Platform ID or no API Key was sent in the request.
- **401** \- An invalid API Key was sent in the request.

See [Error Recover Tips](https://secure.easypaydirectgateway.com/gw/merchants/resources/integration/integration_portal.php#cloud_error_recovery_tips) for common errors and ways to resolve them.

## Display a QR code

Lane 3000, Lane 5000, Lane 7000, Link 2500, Miura M020, Miura M021 devices are capable of displaying a QR code on-screen with an optional header and the ability to specify whether the display of the QR code can be cancelled from the device.

### Headers

Every API request must be authenticated using HTTP Bearer Authentication header and include a Content-Type header.

Request:

```ruby
POST https://secure.easypaydirectgateway.com/api/v2/devices/qrcode/:poiDeviceId
```

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| poiDeviceId | string | yes | The POI device ID you want to interact with. |
| header | string | no | Header text you want to display above the QR code. <br>Value must match expression: ^\[a-zA-Z0-9.,?!&\\/#'-= \]{0,27}$ |
| qr\_data | string | yes | The string you want to be encoded into the QR code. |
| user\_cancelled\_allowed | boolean | no | Enables the ability to return the device display to its idle screen by pressing the device's cancel button. Defaults to false. |

Example Request

```bash
curl --request POST \
--header "Authorization: Bearer {MERCHANT_API_KEY}" \
"https://secure.easypaydirectgateway.com/api/v2/devices/qrcode/d352da6e-8772-4433-92f6-a77c4926fd80 \
--data '{
    "header": "Custom title",
    "qr_data": "My QR content",
    "user_cancelled_allowed": true
}"
```

Example Response

```json
{
    "success": true
}
```

## Hide a QR code

If a QR code is on-screen, returns the device display to its idle screen.

Request:

```ruby
DELETE https://secure.easypaydirectgateway.com/api/v2/devices/display/:poiDeviceId
```

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| poiDeviceId | string | yes | The POI device ID you want to interact with. |

Example Request

```bash
curl --request DELETE \
--header "Authorization: Bearer {MERCHANT_API_KEY}" \
"https://secure.easypaydirectgateway.com/api/v2/devices/qrcode/d352da6e-8772-4433-92f6-a77c4926fd80"
```

Example Response

```json
{
    "success": true
}
```

# POI Device Prompts

There are several variables available to customize the POI Device flow on a per transaction basis. All prompts have a default value (true or false). Not all prompts work together, so see below for an explanation.

- **Keyed Entry**: Using this prompt will provide the cardholder the option to key in their card if desired or if inserting/swiping is not possible for some reason (bad chip, magstripe for example.)

  - **CVV Entry**: When prompting for Keyed entry, specify whether you wish the cardholder to also enter their CVV or not. This is true by default.

- **Signature Prompting**: When inserting/dipping a chip card, signature prompting may be ignored in favor of the chip card communication with the POI Device. For example if the chip card determines that pin entry is required, signature will not be prompted even if sent as 'true'.
- **Amount Confirmation**: Using this prompt will provide the cardholder the option to confirm the amount being charged or not. This is false by default.
- **Tipping**:
  - If prompting for tip, you may set a tip amount via API or allow the customer to enter/select an amount on the POI device itself. Quicktip amount options can be customized as well. See below:
  - **QuickTip Amounts and Percentages**: When sending custom quicktip amounts via API, poi\_prompt\_tip must be sent as 'true'.
    - The iPP320, Lane 3000, Link 2500, M020, and M021 devices will display up to 3 custom amounts.
    - The iSC250, Lane 5000 and Lane 7000 devices will display up to 4 custom amounts.
    - Values will be displayed in the order they are provided. Values beyond 3-4 (depending on the device) will be ignored. Example: If, on an iPP320, the following is sent: poi\_prompt\_quicktip\_amounts: 1.00,2.00,3.00,4.00 - the '4.00' amount will be ignored as the iPP320 only has space for 3 custom amounts.

## POI Device Prompting Request Details

| Variable Name | Description |
| --- | --- |
| tip | The final tip amount, included in the transaction amount, associated with the purchase. <br>**Format**: x.xx |
| poi\_prompt\_tip | When set to 'true', will allow the cardholder to type in a tip amount via the POI Device. When sent in with the 'tip' value, this will show a confirmation of the tip value. If poi\_prompt\_quicktip\_amounts or poi\_prompt\_quicktip\_percentages have been specified then the cardholder will be prompted with a list of values. <br>**Format**: boolean (true/false) <br>**Default**: false |
| poi\_prompt\_quicktip\_amounts | Show an on-screen list of quick tip amount options when tipping via the POI Device. Invalid when sent with poi\_prompt\_tip set to 'false'. Sending an empty value for this parameter will result in an automatically generated list of values sent to the POI Device. This POI Device Prompt is not supported with Miura devices. <br>**Format**: X.XX, comma delimited up to 4 options. <br> Example: 1.50,3.00,4.50 |
| poi\_prompt\_quicktip\_percentages | Show an on-screen list of quick tip percentage options when tipping via the POI Device. Invalid when sent with poi\_prompt\_tip set to 'false'. Cannot be sent with poi\_prompt\_quicktip\_amounts. Sending an empty value for this parameter will result in an automatically generated list of values sent to the POI Device. <br>**Format**: XX.XX, comma delimited up to 4 options. <br> Example: 10.00,15.50,20.34 |
| poi\_enable\_keyed | When set to 'true', provides the option to key-in the card details via the POI Device. This POI Device Prompt is not supported with Miura devices. <br>**Format**: boolean (true/false) <br>**Default**: false |
| poi\_require\_keyed | When set to 'true', forces the cardholder to key-in the card details via the POI Device. This prompt does not allow any other entry method when set. <br>**Note:** Cannot be set to 'true' when poi\_enable\_keyed is also set to 'true'. <br>**Format**: boolean (true/false) <br>**Default**: false |
| poi\_keyed\_type | Specifies the type of keyed transaction. If this variable is not specified and either poi\_enable\_keyed or poi\_require\_keyed is 'true' then defaults to 'cnp'. <br>**Format**: Any one of 'cnp', 'card\_present', 'ecommerce', 'mail\_order', 'telephone\_order' <br>**Default**: cnp when either poi\_enable\_keyed or poi\_require\_keyed is 'true' |
| poi\_prompt\_cvv | When set to 'false', the CVV code will not be requested from the customer via the POI Device on a keyed transaction. Invalid when sent with poi\_enable\_keyed set to 'false' or when poi\_enable\_keyed is not sent. This POI Device Prompt is not supported with Miura devices. <br>**Format**: boolean (true/false) <br>**Default**: true |
| poi\_prompt\_zip | When set to 'true', will enforce zip code/postal entry via the POI Device. **Note**: Entry on the device will override a zip code sent via API in the initial request. <br>**Format**: boolean (true/false) <br>**Default**: false |
| poi\_prompt\_amount\_confirmation | When set to 'true', will force the user to confirm the amount being charged via the POI Device. <br>**Format**: boolean (true/false) <br>**Default**: false |
| poi\_prompt\_signature | When set to 'true', will force the user to sign via the POI Device where supported. When set to 'false', will skip the signature capture step for magstripe transactions. Will be overridden via Chip Card/POI Device interaction when applicable. <br>**Format**: boolean (true/false) <br>**Default**: true |
| poi\_request | If you wish to reset the POI Device before a transaction has been processed, but after the transaction has been requested, you may request a cancellation. This does NOT guarantee the transaction can be cancelled on the device. If the authorization has already begun, you will need to void the transaction after it has completed, assuming it was approved. You must provide the POI Device ID in the request with this prompt. <br>**Value**: 'cancellation' |
| poi\_automatic\_fall\_forward | When set to 'true', will enable Fall Forward (EMV Contactless upgrade to EMV Contact) in-line via the POI Device where supported. When set to 'false', transactions will need to be restarted when tapped cards that are rejected by the Issuer require a contact/EMV insert to occur. <br>**Format**: boolean (true/false) <br>**Default**: true |
| poi\_enable\_void | Enable voids as a part of the transaction flow. For example if the cardholder removes the card after the transaction has been approved but before the transaction can be finalized, the transaction will be voided. <br>**Format**: boolean (true/false) <br>**Default**: false |

Examples:

**Customer Input Tip Prompt**: With the following request, the specified POI device will prompt the cardholder to enter the amount they wish to tip.

**Note**: The default QuickTip options are a calculation of the total amount using the following percentages: 15%, 18%, and 20%. The final amounts will appear as dollar amounts on the device screen.

```nmdirectpost
...type=sale&poi_device_id=0b3043ca-5764-4edc-b720-b652bdf73c9e
            &poi_prompt_tip=true&amount=11.00
```

**Set Tip Prompt**: With the following request, the specified POI device will prompt the cardholder to confirm they wish to tip the amount included with the transaction request (in this example, 1.00). This value will be added onto the amount sent with the transaction request.

```nmdirectpost
...type=sale&poi_device_id=0b3043ca-5764-4edc-b720-b652bdf73c9e
            &poi_prompt_tip=true&tip=1.00&amount=11.00
```

**QuickTip Customization**: With the following request, the specified POI device will display custom amounts or percentages sent in the request. This can be provided with or without a specific tip amount, but must be provided with the basic tip prompt of poi\_prompt\_tip=true.

**Note**: The iPP320, Lane/3000, Link/2500 M020, and M021 will show up to 3 custom options, while the iSC250, Lane/5000, and Lane/7000 will display up to 4. All will show an extra option to enter something other than the set tip or quicktip amounts/percentages.

**QuickTip Amounts:**: With the below example, on Ingenico devices the cardholder would be prompted to confirm the 1.00 amount, but will be able to choose from a list of the provided amounts. Selecting the 'Other' on-screen option will allow for them to enter a custom amount. This prompt is NOT supported on Miura devices.

```nmdirectpost
...type=sale&poi_device_id=0b3043ca-5764-4edc-b720-b652bdf73c9e
&poi_prompt_tip=true&tip=1.00&poi_prompt_quicktip_amounts=1.00,3.00,5.00&...
```

**QuickTip Percentages:**: With the below example, on Ingenico devices the cardholder would be prompted to confirm the 1.00 amount, but will be able to choose from a list of the provided percentages. Selecting the 'Other' on-screen option will allow for them to enter a custom amount.

On Miura devices the cardholder will be prompted with a list of the provided percentages. Selecting the 'Other' on-screen option will prompt for a custom tip amount that is pre-filled with the 1.00 amount.

```nmdirectpost
...type=sale&poi_device_id=0b3043ca-5764-4edc-b720-b652bdf73c9e
&poi_prompt_tip=true&tip=1.00&poi_prompt_quicktip_percentages=10.00,20.00,25.00&...
```

**Enabling Keyed Entry**: With the following request, the specified POI device will show the standard 'Insert or Swipe' message, but also have the option to 'Enter Card' by selecting the F1 key on the device. If 'Enter Card' is selected, the cardholder will be prompted to enter their card number, the expiration date, and the CVV code from the back of the card. This is set to 'false' by default, so it only needs to be sent if you want this option available for use. The ability to have an extra keyed entry option on the 'Enter Card' screen is not supported on Miura devices.

```nmdirectpost
...type=sale&poi_device_id=0b3043ca-5764-4edc-b720-b652bdf73c9e
            &poi_enable_keyed=true...
```

**Enforcing Keyed Entry**: With the following request, the specified POI device will prompt the cardholder to enter their card number, the expiration date, and the CVV code from the back of the card. This is set to 'false' by default, so it only needs to be sent if you want to only allow keyed entry rather than give the 'option' to. This option needs to be used if keyed entry is desired on a Miura device.

```nmdirectpost
...type=sale&poi_device_id=0b3043ca-5764-4edc-b720-b652bdf73c9e
            &poi_require_keyed=true...
```

**CVV Prompt w/ Keyed Entry**: With the following request, the POI device will not display the CVV field when keying in a card to the POI Device. CVV prompting is 'true' by default.

```nmdirectpost
...type=sale&poi_device_id=0b3043ca-5764-4edc-b720-b652bdf73c9e
            &poi_enable_keyed=true&poi_prompt_cvv=false...
```

**Signature Confirmation**: With the following request, the specified POI device will either enforce a digital signature capture (on Ingenico iSC250, Lane 5000, Lane 7000 and Miura M021 devices only) or show a message to capture the signature manually if on a device with no signature capture capabilities (ex: Ingenico Lane 3000, Miura M020.)

**Note**: This prompt will only be honored on magstripe transactions as signature capture enforcement is controlled on EMV transactions by the chip itself which cannot be overridden.

```nmdirectpost
...type=sale&poi_device_id=0b3043ca-5764-4edc-b720-b652bdf73c9e
            &poi_prompt_signature=true...
```

**Amount Confirmation**: With the following request, the specified POI device will either enforce a cardholder to "confirm" the amount shown on the POI Device screen or not. This is 'false' by default, so it must be sent in order to show the amount confirmation prompts.

```nmdirectpost
...type=sale&poi_device_id=0b3043ca-5764-4edc-b720-b652bdf73c9e
            &poi_prompt_amount_confirmation=true...
```

**Device Reset/Cancellation**: With the following request, the current transaction request on specified POI device will be cancelled as long as authorization has not already begun.

```nmdirectpost
...poi_request=cancellation
        &poi_device_id=0b3043ca-5764-4edc-b720-b652bdf73c9e...
```

```nmdirectpost
...response=1
        &responsetext=Transaction cancellation requested. If the transaction cannot be cancelled, you must process a void request once the transaction is complete.
        &...&response_code=100...
```

# Error Recovery Tips

The Customer-Present Cloud API has several responses associated with it with regards to error messages. Use the following to recover more quickly based on the response message associated with the error.

## Device Management

|     |     |
| --- | --- |
| **Message/Issue** | **Explanation and Potential Recovery** |
| **The Problem**: "API key required." | You are not sending an API key for authentication or have not included 'Bearer' where applicable in your header. <br>**The Solution**: Use an existing API key (found on the Security Keys page in a Merchant Gateway Account), or create one. Send a valid Merchant API key in the Authorization header as documented. |
| **The Problem**: "Missing/Invalid Authentication" | You are not passing 'Bearer' and your merchant API key into the Authorization header of your request. <br>**The Solution**: Check that your authorization header request does not include anything other than the word 'Bearer' and your merchant account's API Key. No other words or credentials should be present. See our documented example requests for [Registration/Deregistration](https://secure.easypaydirectgateway.com/merchants/resources/integration/integration_portal.php#cloud_device_management) and [Estate Management](https://secure.easypaydirectgateway.com/merchants/resources/integration/integration_portal.php#cloud_device_estate_management) for more information. |
| **The Problem**: "Missing required field: 'registration code'' | You are not passing the required 'registrationCode' field in the body of your request or are not passing a value into it during device registration. <br>**The Solution**: Use the documented parameter in the body of your request and ensure you are passing a value. |
| **The Problem:** "Missing required field: 'poi device id'" | You are not passing the required POI Device ID in your deregistration request. <br>**The Solution**: Ensure you are passing a value in with the /devices/deregister endpoint. |
| **The Problem**: Encrypted Device service not available | The gateway account you are attempting to process on does not have the correct 'Encrypted Devices' service enabled on it. <br>**The Solution**: Contact the provider of the gateway account to have them enable this service for you. |
| **The Problem**: "Invalid registration code. Please try again." | Occurring exclusively on the registration request, this means that the code provided in the request was not valid at the time of the request. Registration codes expire every 15 minutes, so using an old code will not be possible. <br>**The Solution**: Look at the POI Device screen of the unregistered internet-connected POI Device and use the currently visible code on the screen. |
| **The Problem**: "Device Deregistration Unsuccessful" or "Invalid poi device id" | Whether you are attempting to deregister a device or query on it, you are not passing in the correct POI Device ID value. <br>**The Solution**: Query against the /list endpoint without specifying an ID to get a list of all valid POI Devices and resend your request once you acquire the valid ID. |
| **The Problem**: "I am seeing my device display 'Registered POI Device' instead of the nickname I provided." | **The Solution**: Check that you are sending the proper parameter 'deviceNickname' in during registration. If you are not, the default 'Registered Device' appears instead. You can deregister your device, and re-register it with the proper parameter/nickname value. |
| **The Problem**: "I am not seeing any devices in the poiDeviceID object when I ping the /list endpoint." | **The Solution**: If the response contains no data, this means there are no registered (or deregistered) devices on the account at all. <br> Check that you are using the correct API key for the account you wish to query against. |

## Processing

|     |     |
| --- | --- |
| **Message** | **Explanation and Potential Recovery** |
| **The Problem**: "API key required." | You are not likely sending an API key for authentication. The likely culprit is the use of username/password which is not supported when using a POI Device. <br>**The Solution**: Use an existing API key (found on the Security Keys page in a Merchant Gateway Account), or create one. Use the 'security\_key' variable to pass it in and omit username/password credentials. |
| **The Problem**: "Only one authentication method may be used." | You are likely sending two types of credentials in your request and must only use one. <br>**The Solution**: When processing with a POI device, use the 'security\_key' variable via API to authenticate. Use of the username/password credential set is not supported. |
| **The Problem**: Encrypted Device service not available | The gateway account you are attempting to process on does not have the correct 'Encrypted Devices' service enabled on it. <br>**The Solution**: Contact the provider of the gateway account to have them enable this service for you. |
| **The Problem**: "Invalid poi\_device\_id." | The value being provided in the poi\_device\_id variable is incorrect or invalid. <br>**The Solution**: Query your POI Device estate via API or log into the Merchant Control Panel and check 'Registered Devices' in the License Manager for valid/registered POI Device IDs. |
| **The Problem**: "Communication with the POI device has timed out. Please restart transaction." | The transaction has exceeded the 300 second timeout limit and the transaction has been cancelled. <br>**The Solution**: The transaction must be restarted by sending a new transaction request to the POI Device. |
| **The Problem**: "The POI device already in use. Please complete the current transaction and try again." | The physical device (as represented by the POI Device ID) is currently in the middle of a transaction and cannot be used. <br>**The Solution**: Target a different POI Device ID or cancel the transaction in progress if necessary. |
| **The Problem**: "The transaction was cancelled on the POI device. Please restart transaction." | The transaction was cancelled by the user OR the POI Device itself and will not be successful. <br>**The Solution**: Restart the transaction by sending a new transaction request to the POI Device. |

## Asynchronous Status Polling

|     |     |
| --- | --- |
| **Message** | **Explanation and Potential Recovery** |
| **The Problem**: "API key required." | You are not sending an API key for authentication or have not included 'Bearer' where applicable in your header. <br>**The Solution**: Use an existing API key (found on the Security Keys page in a Merchant Gateway Account), or create one. Send a valid Merchant API key in the Authorization header as documented. |
| **The Problem**: "Missing/Invalid Authentication" | You are not passing 'Bearer' and your merchant API key into the Authorization header of your request. <br>**The Solution**: Check that your authorization header request does not include anything other than the word 'Bearer' and your merchant account's API Key. No other words or credentials should be present. See our documented example requests for [Registration/Deregistration](https://secure.easypaydirectgateway.com/merchants/resources/integration/integration_portal.php#cloud_device_management) and [Estate Management](https://secure.easypaydirectgateway.com/merchants/resources/integration/integration_portal.php#cloud_device_estate_management) for more information. |
| **The Problem**: "Platform Id or API Key not found" | Either the platform ID value you've provided to the polling API is old or invalid, your API key is invalid, or your API key in use was not the key that initiated the transaction. <br>**The Solution**: Check that your API key and platform ID provided match the API key used and platform ID value received in the original asynchronous request **.** If you are polling against an old platform ID, use the Query API to retrieve historical information on transactions. The AsyncStatus API is meant for transactions happening in the moment vs a reporting API. |

**Note**: The vast majority of these errors will be accompanied by a REFID code which you should provide to support for troubleshooting if necessary. If you cannot recover from an error for any reason, contact Customer Support for assistance.

For AsyncStatus API issues, provide the **errorRefUUID** value to support for troubleshooting.

See our documented example requests for the [AsyncStatus API](https://secure.easypaydirectgateway.com/merchants/resources/integration/integration_portal.php#cloud_asyncstatus) for more information.

# VPP Testing Information

**Customer-Present Cloud**

## Overview

The Virtual Pin Pad (VPP) can be used for testing the Customer-Present Cloud API without a device. To do so, use our virtual registration codes which can be submitted to any test gateway account or gateway account that is in test mode. Keep in mind that if an account is in test mode, no actual credit card processing will take place. The VPP will simulate a Visa EMV transaction for the purposes of transaction processing and reporting visibility.

## Transaction Testing Credentials

The Payment Gateway demo account can also be used for testing at any time. Please use the following api-key for testing with this account:

|     |     |
| --- | --- |
| api-key: | 2F822Rw39fx762MaV7Yy86jXGTC7sCDy |

## Registration

VPP Registration requests are submitted with the same API calls as a registration request for a physical device, but using the following special registration codes:

|     |     |
| --- | --- |
| Successful Registration: | T00001 |
| Failed Registration: | T00002 |

All GUIDs returned associated with the VPP (including POI Device IDs and Asynchronous Transaction GUIDs) will always end in 12 zeroes. This will be an indicator that the transaction is a ‘test’ transaction since this will never occur in a live environment.

For example: **3915af04-29fa-49df-88d0-000000000000**

Registration requests using T00001 will return a virtual (fake) POI Device ID which can be used to process test payments and will appear in estate management polling requests. This POI Device ID can also be used to simulate deregistration of an EMV terminal.

## Processing

The POI Device IDs returned via VPP registration can be used in both synchronous or asynchronous processing requests.

|     |     |
| --- | --- |
| Process an approved transaction | Send an amount greater than or equal to 1.00 |
| Process a declined transaction | Send an amount less than 1.00 |

When using Synchronous processing, you can expect to wait a few seconds before receiving a response. The VPP does not simulate the full five (5) minute wait time, but you will want to plan ahead to expect longer wait times for customer interaction.

VPP AsyncStatus GUIDs will only simulate an immediate ‘interactionComplete’ response versus remaining ‘inFlight’ for customer interaction.

If you would like to test Customer Vault interaction with VPP, simply send the standard Customer Vault action variables along with your transaction request.

## Transaction Contents for VPP Transactions

- Card Brand: Visa
- Card Number: 4111111111111111
- Expiration Date: 0229
- Full Name: JOHN SMITH
  - Cardholder Verification Method: Pin Entered
  - Application ID: A0000000031010
  - Application Label: VISA CREDIT
  - Application Preferred Name: CREDITO DE VISA
  - Transaction Status Info: E800
  - PAN Sequence Number: 01
  - Masked MID: XXXXXXXXXX1234
  - Auth Code: 123456

## Deregistering VPP devices

The POI Device ID can be used to deregister the VPP device - exactly like a real POI Device ID.

## Triggering Errors in Test Mode

- To cause a declined response, pass an amount less than 1.00.
- To trigger a fatal error message in processing, pass an invalid POI Device ID.
- To cause an unknown AsyncStatus GUID, pass an invalid GUID.
- To cause an empty Estate Management response, pass an invalid GUID.

See [Registration and Deregistration](https://secure.easypaydirectgateway.com/gw/merchants/resources/integration/integration_portal.php#cloud_device_management),  [Estate Management](https://secure.easypaydirectgateway.com/gw/merchants/resources/integration/integration_portal.php#cloud_device_estate_management),  [Transaction Processing](https://secure.easypaydirectgateway.com/gw/merchants/resources/integration/integration_portal.php#cloud_synchronous_and_asynchronous), and [AsyncStatus API](https://secure.easypaydirectgateway.com/gw/merchants/resources/integration/integration_portal.php#cloud_asyncstatus) documentation for more information on these concepts.

VPP does not support handling [POI device prompts](https://secure.easypaydirectgateway.com/gw/merchants/resources/integration/integration_portal.php#cloud_poi_device_prompts) at this time, though sending the variables in your request will not cause errors. These prompts require interaction with a physical device though have very little effect on the final responses or API calls.

# Setting Up Webhooks

Before anything else, you need to have a URL endpoint set up to receive POST requests.
This will be a server location that you control and can use to process webhook messages as
they are delivered.


### Step 1

From the Settings > Webhooks page, click the “Add Endpoint” button.

### Step 2

Enter your webhook receiver URL and select all event types you would like to be notified
of from the list. As soon as the URL is saved, you will start to receive events at the URL
specified; there is no further setup required. Please note that all URLs must start with
“https” and have valid TLS encryption enabled.


### Step 3

The Webhooks settings page shows your webhooks signing key. This value should be used on
your website to authenticate that it is the gateway delivering these messages and not a
third party.


Here is an example implementation in PHP:

```php

  function webhookIsVerified($webhookBody, $signingKey, $nonce, $sig) {
    return $sig === hash_hmac("sha256", $nonce . "." . $webhookBody, $signingKey);
  }

  try {
    $signingKey = "YOUR_SIGNING_KEY_HERE";
    $webhookBody = file_get_contents("php://input");
    $headers = getallheaders();
    $sigHeader = $headers['Webhook-Signature'];

    if (!is_null($sigHeader) && strlen($sigHeader) < 1) {
    throw new Exception("invalid webhook - signature header missing");
  }

    if (preg_match('/t=(.*),s=(.*)/', $sigHeader, $matches)) {
    $nonce = $matches[1];
    $signature = $matches[2];
  } else {
    throw new Exception("unrecognized webhook signature format");
  }

    if (!webhookIsVerified($webhookBody, $signingKey, $nonce, $signature)) {
    throw new Exception("invalid webhook - invalid signature, cannot verify sender");
  }

    // webhook is now verified to have been sent by us, continue processing

    echo "webhook is verified";
    $webhook = json_decode($webhookBody);
    var_export($webhook);
  } catch (Exception $e) {
    echo "error: $e\n";
  }

```

### Step 4

Webhooks will only be delivered from the following IP addresses. It is advisable to limit
your webhook endpoints to only receive requests originating from these addresses:


104.192.32.81 through 104.192.32.87

104.192.36.81 through 104.192.36.87

# Events

Each endpoint can be subscribed to specific events that happen in the gateway. Most events have
multiple versions: success, failure, and unknown.

## Available Event Types

| Event Category | Description |
| --- | --- |
| Transactions | Sales, auths, captures, voids, refunds, and credits. Each transaction type can be<br> filtered by successful, failed, and unknown transactions. |
| Recurring | Available for new, updated, and/or canceled subscriptions and plans. |
| Settlement | Batch summaries and can be filtered by successful and failed settlements. |
| Chargebacks | If your processor supports chargeback reporting, chargebacks can be delivered<br> as events. |
| Automatic Card Updater | Available for card records updated, marked as closed, or for customer contact in the Customer Vault and/or recurring subscription records. |

# Retry Logic

If we try to deliver a webhook notification to your endpoint and do not get an HTTP 200
response, the gateway will reattempt delivery up to 20 times. Over the course of 3 days we
will keep trying until a success response is received. If no success response is received
in this time period the notification will stop attempting and will not be delivered.


The approximate interval between delivery retires is currently:


- 1 attempt 15 seconds after the initial attempt
- 3 attempts every 60 seconds
- 1 attempt 5 minutes later
- 1 attempt 15 minutes later
- 1 attempt 30 minutes later
- 10 attempts every hour
- 2 attempts every 12 hours
- 1 final attempt after 24 more hours

Your application should not rely on this specific retry schedule, as the retry timing may change in the future.


The retry schedule may also change based on current circumstances. For example, if there are a large number of pending notifications for your endpoint,
we may significantly reduce the number of retry attempts for that endpoint until the backlog is cleared.


## Credit Card Sale

```json

{
    "event_id": "9b312dfd-3174-4748-9447-d63c8744305a",
    "event_type": "transaction.sale.success",
    "event_body": {
        "merchant": {
            "id": "1234",
            "name": "Test Account"
        },
        "features": {
            "is_test_mode": true
        },
        "transaction_id": "1234560000",
        "transaction_type": "cc",
        "condition": "pendingsettlement",
        "processor_id": "ccprocessora",
        "ponumber": "123456789",
        "order_description": "this is a description",
        "order_id": "12345678",
        "customerid": "",
        "customertaxid": "",
        "website": "https://example.com",
        "shipping": "",
        "currency": "USD",
        "tax": "0.08",
        "surcharge": "",
        "cash_discount": "",
        "tip": "",
        "requested_amount": "54.04",
        "shipping_carrier": "",
        "tracking_number": "",
        "shipping_date": "",
        "partial_payment_id": "",
        "partial_payment_balance": "",
        "platform_id": "",
        "authorization_code": "123456",
        "social_security_number": "",
        "drivers_license_number": "",
        "drivers_license_state": "",
        "drivers_license_dob": "",
        "billing_address": {
            "first_name": "Jessica",
            "last_name": "Jones",
            "address_1": "123 Fake St.",
            "address_2": "123123",
            "company": "Alias Investigations",
            "city": "New York City",
            "state": "NY",
            "postal_code": "12345",
            "country": "US",
            "email": "someone@example.com",
            "phone": "555-555-5555",
            "cell_phone": "",
            "fax": "444-555-6666"
        },
        "shipping_address": {
            "first_name": "Jessica",
            "last_name": "Jones",
            "address_1": "123 Fake St.",
            "address_2": "123123",
            "company": "Alias Investigations",
            "city": "New York City",
            "state": "NY",
            "postal_code": "12345",
            "country": "US",
            "email": "someone@example.com",
            "phone": "",
            "fax": ""
        },
        "card": {
            "cc_number": "411111******1111",
            "cc_exp": "1022",
            "cavv": "",
            "cavv_result": "",
            "xid": "",
            "eci": "",
            "avs_response": "N",
            "csc_response": "",
            "cardholder_auth": "",
            "cc_start_date": "",
            "cc_issue_number": "",
            "card_balance": "",
            "card_available_balance": "",
            "entry_mode": "",
            "cc_bin": "",
            "cc_type": ""
        },
        "action": {
            "amount": "54.04",
            "action_type": "sale",
            "date": "20200406175755",
            "success": "1",
            "ip_address": "1.2.3.4",
            "source": "virtual_terminal",
            "api_method": "virtual_terminal",
            "username": "exampleuser",
            "response_text": "SUCCESS",
            "response_code": "100",
            "processor_response_text": "",
            "processor_response_code": "",
            "device_license_number": "",
            "device_nickname": ""
        }
    }
}

```

## Event Body Reference

### card.entry\_mode

| Code | Description |
| --- | --- |
| 0 | Unknown |
| 1 | Invalid |
| 2 | NFC MSD |
| 3 | Swiped |
| 4 | Keyed |
| 5 | EMV ICC |
| 6 | NFC EMV |
| 7 | Keyed - Fallback |
| 8 | Swiped - Fallback |

## Electronic Check Sale

```json

{
    "event_id": "c1ee29d9-dd29-45d0-903a-c78da43bca32",
    "event_type": "transaction.sale.success",
    "event_body": {
        "merchant": {
            "id": "12345",
            "name": "Test Account"
        },
        "features": {
            "is_test_mode": true
        },
        "transaction_id": "1234560000",
        "transaction_type": "ck",
        "condition": "pendingsettlement",
        "processor_id": "ckprocessora",
        "ponumber": "",
        "order_description": "",
        "order_id": "",
        "customerid": "",
        "customertaxid": "",
        "website": "",
        "shipping": "",
        "currency": "USD",
        "tax": "1.00",
        "surcharge": "",
        "cash_discount": "",
        "tip": "",
        "requested_amount": "60.49",
        "shipping_carrier": "",
        "tracking_number": "",
        "shipping_date": "",
        "partial_payment_id": "",
        "partial_payment_balance": "",
        "platform_id": "",
        "authorization_code": "123456",
        "social_security_number": "",
        "drivers_license_number": "",
        "drivers_license_state": "",
        "drivers_license_dob": "****-**-**",
        "billing_address": {
            "first_name": "Jessica",
            "last_name": "Jones",
            "address_1": "123 Fake St.",
            "address_2": "",
            "company": "Alias Investigations",
            "city": "New York City",
            "state": "NY",
            "postal_code": "12345",
            "country": "US",
            "email": "someone@example.com",
            "phone": "5555555555",
            "cell_phone": "",
            "fax": ""
        },
        "shipping_address": {
            "first_name": "Jessica",
            "last_name": "Jones",
            "address_1": "123 Fake St.",
            "address_2": "",
            "company": "Alias Investigations",
            "city": "New York City",
            "state": "NY",
            "postal_code": "12345",
            "country": "US",
            "email": "someone@example.com",
            "phone": "",
            "fax": ""
        },
        "check": {
            "check_account": "*****1234",
            "check_aba": "100000000",
            "check_name": "Jessica Jones",
            "account_holder_type": "personal",
            "account_type": "checking",
            "sec_code": "WEB"
        },
        "action": {
            "amount": "60.49",
            "action_type": "sale",
            "date": "20200406180124",
            "success": "1",
            "ip_address": "1.2.3.4",
            "source": "virtual_terminal",
            "api_method": "virtual_terminal",
            "username": "exampleuser",
            "response_text": "SUCCESS",
            "response_code": "100",
            "processor_response_text": "",
            "processor_response_code": "",
            "device_license_number": "",
            "device_nickname": ""
        }
    }
}

```

## Cash Sale

```json

{
    "event_id": "e88bfc27-2d42-46a1-8427-65b4a7f11f16",
    "event_type": "transaction.sale.success",
    "event_body": {
        "merchant": {
            "id": "123456",
            "name": "Test Account"
        },
        "features": {
            "is_test_mode": true
        },
        "transaction_id": "1234560000",
        "transaction_type": "cs",
        "condition": "complete",
        "processor_id": "csprocessora",
        "ponumber": "",
        "order_description": "",
        "order_id": "",
        "customerid": "",
        "customertaxid": "",
        "website": "",
        "shipping": "",
        "currency": "USD",
        "tax": "1.00",
        "surcharge": "",
        "cash_discount": "",
        "tip": "",
        "requested_amount": "60.49",
        "shipping_carrier": "",
        "tracking_number": "",
        "shipping_date": "",
        "partial_payment_id": "",
        "partial_payment_balance": "",
        "platform_id": "1",
        "authorization_code": "",
        "social_security_number": "",
        "drivers_license_number": "",
        "drivers_license_state": "",
        "drivers_license_dob": "",
        "billing_address": {
            "first_name": "Jessica",
            "last_name": "Jones",
            "address_1": "123 Fake St.",
            "address_2": "",
            "company": "Alias Investigations",
            "city": "New York City",
            "state": "NY",
            "postal_code": "12345",
            "country": "US",
            "email": "someone@example.com",
            "phone": "+15555555555",
            "cell_phone": "",
            "fax": ""
        },
        "shipping_address": {
            "first_name": "Jessica",
            "last_name": "Jones",
            "address_1": "123 Fake St.",
            "address_2": "",
            "company": "Alias Investigations",
            "city": "New York City",
            "state": "NY",
            "postal_code": "12345",
            "country": "US",
            "email": "someone@example.com",
            "phone": "",
            "fax": ""
        },
        "action": {
            "amount": "60.49",
            "action_type": "sale",
            "date": "20200406180150",
            "success": "1",
            "ip_address": "1.2.3.4",
            "source": "virtual_terminal",
            "api_method": "virtual_terminal",
            "username": "exampleuser",
            "response_text": "APPROVED",
            "response_code": "100",
            "processor_response_text": "Approved",
            "processor_response_code": "1",
            "device_license_number": "",
            "device_nickname": ""
        }
    }
}

```

## Credit Card Sale

```json

{
    "event_id": "9b312dfd-3174-4748-9447-d63c8744305a",
    "event_type": "transaction.check.status.settle",
    "event_body": {
        "merchant": {
            "id": "1234",
            "name": "Test Account"
        },
        "features": {
            "is_test_mode": true
        },
        "transaction_id": "1234560000",
        "transaction_type": "ck",
        "condition": "complete",
        "processor_id": "ckprocessora",
        "ponumber": "123456789",
        "order_description": "this is a description",
        "order_id": "12345678",
        "customerid": "",
        "customertaxid": "",
        "website": "https://example.com",
        "shipping": "",
        "currency": "USD",
        "tax": "0.08",
        "surcharge": "",
        "cash_discount": "",
        "tip": "",
        "requested_amount": "54.04",
        "shipping_carrier": "",
        "tracking_number": "",
        "shipping_date": "",
        "partial_payment_id": "",
        "partial_payment_balance": "",
        "platform_id": "12345678",
        "authorization_code": "",
        "social_security_number": "",
        "drivers_license_number": "",
        "drivers_license_state": "",
        "drivers_license_dob": "",
        "billing_address": {
            "first_name": "Jessica",
            "last_name": "Jones",
            "address_1": "123 Fake St.",
            "address_2": "123123",
            "company": "Alias Investigations",
            "city": "New York City",
            "state": "NY",
            "postal_code": "12345",
            "country": "US",
            "email": "someone@example.com",
            "phone": "555-555-5555",
            "cell_phone": "",
            "fax": "444-555-6666"
        },
        "shipping_address": {
            "first_name": "Jessica",
            "last_name": "Jones",
            "address_1": "123 Fake St.",
            "address_2": "123123",
            "company": "Alias Investigations",
            "city": "New York City",
            "state": "NY",
            "postal_code": "12345",
            "country": "US",
            "email": "someone@example.com",
            "phone": "",
            "fax": ""
        },
        "check": {
            "check_account": "123456****1234",
            "check_aba": "123456789",
            "check_name": "Fake Person",
            "account_holder_type": "personal",
            "account_type": "checking",
            "sec_code": "WEB"
        },
        "merchant_defined_fields": {},
        "action": {
            "amount": "54.04",
            "action_type": "settle",
            "date": "20200406175755",
            "success": "1",
            "ip_address": "",
            "source": "internal",
            "api_method": "",
            "username": "",
            "response_text": "Paid",
            "response_code": "100",
            "processor_response_text": "",
            "tap_to_mobile": false,
            "processor_response_code": "",
            "device_license_number": "",
            "device_nickname": ""
        }
    }
}

```

## Credit Card Sale

```json

{
    "event_id": "9b312dfd-3174-4748-9447-d63c8744305a",
    "event_type": "transaction.check.status.return",
    "event_body": {
        "merchant": {
            "id": "1234",
            "name": "Test Account"
        },
        "features": {
            "is_test_mode": true
        },
        "transaction_id": "1234560000",
        "transaction_type": "ck",
        "condition": "failed",
        "processor_id": "ckprocessora",
        "ponumber": "123456789",
        "order_description": "this is a description",
        "order_id": "12345678",
        "customerid": "",
        "customertaxid": "",
        "website": "https://example.com",
        "shipping": "",
        "currency": "USD",
        "tax": "0.08",
        "surcharge": "",
        "cash_discount": "",
        "tip": "",
        "requested_amount": "54.04",
        "shipping_carrier": "",
        "tracking_number": "",
        "shipping_date": "",
        "partial_payment_id": "",
        "partial_payment_balance": "",
        "platform_id": "12345678",
        "authorization_code": "",
        "social_security_number": "",
        "drivers_license_number": "",
        "drivers_license_state": "",
        "drivers_license_dob": "",
        "billing_address": {
            "first_name": "Jessica",
            "last_name": "Jones",
            "address_1": "123 Fake St.",
            "address_2": "123123",
            "company": "Alias Investigations",
            "city": "New York City",
            "state": "NY",
            "postal_code": "12345",
            "country": "US",
            "email": "someone@example.com",
            "phone": "555-555-5555",
            "cell_phone": "",
            "fax": "444-555-6666"
        },
        "shipping_address": {
            "first_name": "Jessica",
            "last_name": "Jones",
            "address_1": "123 Fake St.",
            "address_2": "123123",
            "company": "Alias Investigations",
            "city": "New York City",
            "state": "NY",
            "postal_code": "12345",
            "country": "US",
            "email": "someone@example.com",
            "phone": "",
            "fax": ""
        },
        "check": {
            "check_account": "123456****1234",
            "check_aba": "123456789",
            "check_name": "Fake Person",
            "account_holder_type": "personal",
            "account_type": "checking",
            "sec_code": "WEB"
        },
        "merchant_defined_fields": {},
        "action": {
            "amount": "54.04",
            "action_type": "check_return",
            "date": "20200406175755",
            "success": "1",
            "ip_address": "",
            "source": "internal",
            "api_method": "",
            "username": "",
            "response_text": "Returned",
            "response_code": "100",
            "processor_response_text": "",
            "tap_to_mobile": false,
            "processor_response_code": "",
            "device_license_number": "",
            "device_nickname": ""
        }
    }
}

```

## Credit Card Sale

```json

{
    "event_id": "9b312dfd-3174-4748-9447-d63c8744305a",
    "event_type": "transaction.check.status.latereturn",
    "event_body": {
        "merchant": {
            "id": "1234",
            "name": "Test Account"
        },
        "features": {
            "is_test_mode": true
        },
        "transaction_id": "1234560000",
        "transaction_type": "ck",
        "condition": "failed",
        "processor_id": "ckprocessora",
        "ponumber": "123456789",
        "order_description": "this is a description",
        "order_id": "12345678",
        "customerid": "",
        "customertaxid": "",
        "website": "https://example.com",
        "shipping": "",
        "currency": "USD",
        "tax": "0.08",
        "surcharge": "",
        "cash_discount": "",
        "tip": "",
        "requested_amount": "54.04",
        "shipping_carrier": "",
        "tracking_number": "",
        "shipping_date": "",
        "partial_payment_id": "",
        "partial_payment_balance": "",
        "platform_id": "12345678",
        "authorization_code": "",
        "social_security_number": "",
        "drivers_license_number": "",
        "drivers_license_state": "",
        "drivers_license_dob": "",
        "billing_address": {
            "first_name": "Jessica",
            "last_name": "Jones",
            "address_1": "123 Fake St.",
            "address_2": "123123",
            "company": "Alias Investigations",
            "city": "New York City",
            "state": "NY",
            "postal_code": "12345",
            "country": "US",
            "email": "someone@example.com",
            "phone": "555-555-5555",
            "cell_phone": "",
            "fax": "444-555-6666"
        },
        "shipping_address": {
            "first_name": "Jessica",
            "last_name": "Jones",
            "address_1": "123 Fake St.",
            "address_2": "123123",
            "company": "Alias Investigations",
            "city": "New York City",
            "state": "NY",
            "postal_code": "12345",
            "country": "US",
            "email": "someone@example.com",
            "phone": "",
            "fax": ""
        },
        "check": {
            "check_account": "123456****1234",
            "check_aba": "123456789",
            "check_name": "Fake Person",
            "account_holder_type": "personal",
            "account_type": "checking",
            "sec_code": "WEB"
        },
        "merchant_defined_fields": {},
        "action": {
            "amount": "54.04",
            "action_type": "check_late_return",
            "date": "20200406175755",
            "success": "1",
            "ip_address": "",
            "source": "internal",
            "api_method": "",
            "username": "",
            "response_text": "Reversed",
            "response_code": "100",
            "processor_response_text": "",
            "tap_to_mobile": false,
            "processor_response_code": "",
            "device_license_number": "",
            "device_nickname": ""
        }
    }
}

```

## New Credit Card Subscription

```json

{
	"event_id": "e88bfc27-2d42-46a1-8427-65b4a7f11f16",
	"event_type": "recurring.subscription.add",
	"event_body": {
		"merchant": {
			"id": "123456",
			"name": "Test Account"
		},
		 "features": {
            "is_test_mode": true
        },
		"subscription_id": "12345678",
		"subscription_type": "cc",
		"processor_id": "",
		"next_charge_date": "2022-02-01",
		"completed_payments": 0,
		"attempted_payments": 0,
		"remaining_payments": 8,
		"ponumber": "",
		"order_id": "",
		"order_description": "",
		"shipping": "",
		"tax": "",
		"website": "",
		"plan": {
			"id": "1234",
			"name": "my plan",
			"amount": "20.00",
			"day_frequency": null
			"payments": 8,
			"month_frequency": 9,
			"day_of_month": 10
		},
		"billing_address": {
            "first_name": "Jessica",
            "last_name": "Jones",
            "address_1": "123 Fake St.",
            "address_2": "123123",
            "company": "Alias Investigations",
            "city": "New York City",
            "state": "NY",
            "postal_code": "12345",
            "country": "US",
            "email": "someone@example.com",
            "phone": "555-555-5555",
            "cell_phone": "",
            "fax": "444-555-6666"
		},
		"card" : {
            "cc_number": "411111******1111",
            "cc_exp": "1022",
            "cavv": "",
            "cavv_result": "",
            "xid": "",
            "eci": "",
            "avs_response": "N",
            "csc_response": "",
            "cardholder_auth": "",
            "cc_start_date": "",
            "cc_issue_number": "",
            "card_balance": "",
            "card_available_balance": "",
            "entry_mode": "",
            "cc_bin": "",
            "cc_type": ""
        }
	}
}

```

## New Check Subscription

```json

{
	"event_id": "e88bfc27-2d42-46a1-8427-65b4a7f11f16",
	"event_type": "recurring.subscription.add",
	"event_body": {
		"merchant": {
			"id": "123456",
			"name": "Test Account"
		},
		"features": {
            "is_test_mode": true
        },
		"subscription_id": "12345678",
		"subscription_type": "ck",
		"processor_id": "",
		"next_charge_date": "2022-02-01",
		"completed_payments": 0,
		"attempted_payments": 0,
		"remaining_payments": 8,
		"ponumber": "",
		"order_id": "",
		"order_description": "",
		"shipping": "",
		"tax": "",
		"website": "",
		"plan": {
			"id": "1234",
			"name": "my plan",
			"amount": "20.00",
			"day_frequency": null
			"payments": 8,
			"month_frequency": 9,
			"day_of_month": 10
		},
		"billing_address": {
            "first_name": "Jessica",
            "last_name": "Jones",
            "address_1": "123 Fake St.",
            "address_2": "123123",
            "company": "Alias Investigations",
            "city": "New York City",
            "state": "NY",
            "postal_code": "12345",
            "country": "US",
            "email": "someone@example.com",
            "phone": "555-555-5555",
            "cell_phone": "",
            "fax": "444-555-6666"
		},
        "check": {
            "check_account": "*****1234",
            "check_aba": "100000000",
            "check_name": "Jessica Jones",
            "account_holder_type": "personal",
            "account_type": "checking",
            "sec_code": "WEB"
        }
	}
}

```

## Update Credit Card Subscription

```json

{
	"event_id": "e88bfc27-2d42-46a1-8427-65b4a7f11f16",
	"event_type": "recurring.subscription.update",
	"event_body": {
		"merchant": {
			"id": "123456",
			"name": "Test Account"
		},
		"features": {
            "is_test_mode": true
        },
		"subscription_id": "12345678",
		"subscription_type": "cc",
		"processor_id": "",
		"next_charge_date": "2022-02-01",
		"completed_payments": 0,
		"attempted_payments": 0,
		"remaining_payments": 8,
		"ponumber": "",
		"order_id": "",
		"order_description": "",
		"shipping": "",
		"tax": "",
		"website": "",
		"plan": {
			"id": "1234",
			"name": "my plan",
			"amount": "20.00",
			"day_frequency": null
			"payments": 8,
			"month_frequency": 9,
			"day_of_month": 10
		},
		"billing_address": {
            "first_name": "Jessica",
            "last_name": "Jones",
            "address_1": "123 Fake St.",
            "address_2": "123123",
            "company": "Alias Investigations",
            "city": "New York City",
            "state": "NY",
            "postal_code": "12345",
            "country": "US",
            "email": "someone@example.com",
            "phone": "555-555-5555",
            "cell_phone": "",
            "fax": "444-555-6666"
		},
		"card" : {
            "cc_number": "411111******1111",
            "cc_exp": "1022",
            "cavv": "",
            "cavv_result": "",
            "xid": "",
            "eci": "",
            "avs_response": "N",
            "csc_response": "",
            "cardholder_auth": "",
            "cc_start_date": "",
            "cc_issue_number": "",
            "card_balance": "",
            "card_available_balance": "",
            "entry_mode": "",
            "cc_bin": "",
            "cc_type": ""
        }
	}
}

```

## Update Check Subscription

```json

{
	"event_id": "e88bfc27-2d42-46a1-8427-65b4a7f11f16",
	"event_type": "recurring.subscription.update",
	"event_body": {
		"merchant": {
			"id": "123456",
			"name": "Test Account"
		},
		"subscription_id": "12345678",
		"subscription_type": "ck",
		"processor_id": "",
		"next_charge_date": "2022-02-01",
		"completed_payments": 0,
		"attempted_payments": 0,
		"remaining_payments": 8,
		"ponumber": "",
		"order_id": "",
		"order_description": "",
		"shipping": "",
		"tax": "",
		"website": "",
		"plan": {
			"id": "1234",
			"name": "my plan",
			"amount": "20.00",
			"day_frequency": null
			"payments": 8,
			"month_frequency": 9,
			"day_of_month": 10
		},
		"billing_address": {
            "first_name": "Jessica",
            "last_name": "Jones",
            "address_1": "123 Fake St.",
            "address_2": "123123",
            "company": "Alias Investigations",
            "city": "New York City",
            "state": "NY",
            "postal_code": "12345",
            "country": "US",
            "email": "someone@example.com",
            "phone": "555-555-5555",
            "cell_phone": "",
            "fax": "444-555-6666"
		},
        "check": {
            "check_account": "*****1234",
            "check_aba": "100000000",
            "check_name": "Jessica Jones",
            "account_holder_type": "personal",
            "account_type": "checking",
            "sec_code": "WEB"
        }
	}
}

```

## Canceled Credit Card Subscription

```json

{
	"event_id": "e88bfc27-2d42-46a1-8427-65b4a7f11f16",
	"event_type": "recurring.subscription.delete",
	"event_body": {
		"merchant": {
			"id": "123456",
			"name": "Test Account"
		},
		"features": {
            "is_test_mode": true
        },
		"subscription_id": "12345678",
		"subscription_type": "cc",
		"processor_id": "",
		"next_charge_date": "2022-02-01",
		"completed_payments": 0,
		"attempted_payments": 0,
		"remaining_payments": 8,
		"ponumber": "",
		"order_id": "",
		"order_description": "",
		"shipping": "",
		"tax": "",
		"website": "",
		"plan": {
			"id": "1234",
			"name": "my plan",
			"amount": "20.00",
			"day_frequency": null
			"payments": 8,
			"month_frequency": 9,
			"day_of_month": 10
		},
		"billing_address": {
            "first_name": "Jessica",
            "last_name": "Jones",
            "address_1": "123 Fake St.",
            "address_2": "123123",
            "company": "Alias Investigations",
            "city": "New York City",
            "state": "NY",
            "postal_code": "12345",
            "country": "US",
            "email": "someone@example.com",
            "phone": "555-555-5555",
            "cell_phone": "",
            "fax": "444-555-6666"
		},
		"card" : {
            "cc_number": "411111******1111",
            "cc_exp": "1022",
            "cavv": "",
            "cavv_result": "",
            "xid": "",
            "eci": "",
            "avs_response": "N",
            "csc_response": "",
            "cardholder_auth": "",
            "cc_start_date": "",
            "cc_issue_number": "",
            "card_balance": "",
            "card_available_balance": "",
            "entry_mode": "",
            "cc_bin": "",
            "cc_type": ""
        }
	}
}

```

## Canceled Check Subscription

```json

{
	"event_id": "e88bfc27-2d42-46a1-8427-65b4a7f11f16",
	"event_type": "recurring.subscription.delete",
	"event_body": {
		"merchant": {
			"id": "123456",
			"name": "Test Account"
		},
		"features": {
            "is_test_mode": true
        },
		"subscription_id": "12345678",
		"subscription_type": "ck",
		"processor_id": "",
		"next_charge_date": "2022-02-01",
		"completed_payments": 0,
		"attempted_payments": 0,
		"remaining_payments": 8,
		"ponumber": "",
		"order_id": "",
		"order_description": "",
		"shipping": "",
		"tax": "",
		"website": "",
		"plan": {
			"id": "1234",
			"name": "my plan",
			"amount": "20.00",
			"day_frequency": null
			"payments": 8,
			"month_frequency": 9,
			"day_of_month": 10
		},
		"billing_address": {
            "first_name": "Jessica",
            "last_name": "Jones",
            "address_1": "123 Fake St.",
            "address_2": "123123",
            "company": "Alias Investigations",
            "city": "New York City",
            "state": "NY",
            "postal_code": "12345",
            "country": "US",
            "email": "someone@example.com",
            "phone": "555-555-5555",
            "cell_phone": "",
            "fax": "444-555-6666"
		},
        "check": {
            "check_account": "*****1234",
            "check_aba": "100000000",
            "check_name": "Jessica Jones",
            "account_holder_type": "personal",
            "account_type": "checking",
            "sec_code": "WEB"
        }
	}
}

```

## New Plan

```json

{
	"event_id": "e88bfc27-2d42-46a1-8427-65b4a7f11f16",
	"event_type": "recurring.plan.add",
	"event_body": {
		"merchant": {
			"id": "123456",
			"name": "Test Account"
		},
		"features": {
            "is_test_mode": true
        },
		"id": "1234",
		"name": "my plan",
		"amount": "20.00",
		"day_frequency": null
		"payments": 8,
		"month_frequency": 9,
		"day_of_month": 10,
	}
}

```

## Update Plan

```json

{
	"event_id": "e88bfc27-2d42-46a1-8427-65b4a7f11f16",
	"event_type": "recurring.plan.update",
	"event_body": {
		"merchant": {
			"id": "123456",
			"name": "Test Account"
		},
		"features": {
            "is_test_mode": true
        },
		"id": "1234",
		"name": "my plan",
		"amount": "20.00",
		"day_frequency": null
		"payments": 8,
		"month_frequency": 9,
		"day_of_month": 10,
	}
}

```

## Canceled Plan

```json

{
	"event_id": "e88bfc27-2d42-46a1-8427-65b4a7f11f16",
	"event_type": "recurring.plan.delete",
	"event_body": {
		"merchant": {
			"id": "123456",
			"name": "Test Account"
		},
		"features": {
            "is_test_mode": true
        },
		"id": "1234",
		"name": "my plan",
		"amount": "20.00",
		"day_frequency": null
		"payments": 8,
		"month_frequency": 9,
		"day_of_month": 10,
	}
}

```

```json

{
    "event_id": "11750910-bd03-4f9a-871a-786203df177f",
    "event_type": "settlement.batch.complete",
    "event_body": {
        "batch_id": "12345678",
        "count": 4,
        "amount": "402.81",
        "merchant": {
            "id": "123456",
            "name": "Test Account"
        },
        "processor": {
            "id": "ccprocessor",
            "name": "CC Processor",
            "type": "cc"
        },
        "by_card_type": {
            "visa": {
                "count": 4,
                "amount": "402.81"
            }
        },
        "transaction_ids": [\
            "1234000000",\
            "1234000001",\
            "1234000002",\
            "1234000003"\
        ]
    }
}

```

```json

{
    "event_id": "dfe8156d-5dd9-43ac-8928-3cf70ef74108",
    "event_type": "settlement.batch.failure",
    "event_body": {
        "batch_id": "123456",
        "merchant": {
            "id": "123456",
            "name": "Test Merchant"
        },
        "processor": {
            "id": "ccprocessor",
            "name": "CC Processor",
            "type": "cc"
        }
    }
}

```

```json

{
    "event_id": "d5b08691-cf24-41a4-9a5f-af8a1f5e2a13",
    "event_type": "chargeback.batch.complete",
    "event_body": {
        "merchant": {
            "id": "123456",
            "name": "Test Account"
        },
        "processor": {
            "id": "ccprocessor",
            "name": "CC Processor",
            "type": "cc"
        },
        "count": 2,
        "chargeback_amount": "11.11",
        "chargebacks": [\
            {\
                "id": "1234567890",\
                "date": "3/29/2020",\
                "customer_name": "Someone Smith",\
                "cc_number": "411111******1111",\
                "amount": "11.11",\
                "reason": "101: Introductory chargeback"\
            },\
            {\
                "id": "1234567891",\
                "date": "3/29/2020",\
                "customer_name": "Another Person Jr.",\
                "cc_number": "543111******1111",\
                "amount": "18.11",\
                "reason": "101: Introductory chargeback"\
            }\
        ]
    }
}

```

```json

{
   "event_id": "7958c536-88f0-47f4-bb55-54575259a3be",
   "event_type": "acu.summary.automaticallyupdated",
   "event_body": {
        "updated_date": "2022-08-22",
        "merchant": {
            "id": 123456,
            "name": "Test Account"
        },
        "cards_checked": {
            "customer_vault": {
                "checked": 376,
                "updated": 4
            },
            "subscriptions": {
                "checked": 434,
                "updated": 3,
            }
        },
        "vault_count_updated_cards": 1,
        "vault_updated_cards": [\
            {\
                "customer_vault_id": "308229500",\
                "billing_id": "1781228768",\
                "cc_number": "445701******0009",\
                "cc_exp": "01/50",\
                "first_name": "Bob",\
                "last_name": "Smith",\
                "email": "bsmith@example.com",\
                "phone": "+14801112222"\
            }\
        ],
        "vault_count_updated_expiration_dates": 3,
        "vault_updated_expiration_dates": [\
            {\
                 "customer_vault_id": "2061222895",\
                 "billing_id": "350282046",\
                 "cc_number": "400000******0002",\
                 "cc_exp": "11/70",\
                 "first_name": "Bob",\
                 "last_name": "Smith",\
                 "email": "bobsmith@company.com",\
                 "phone": "4801112222"\
             },\
             {\
                 "customer_vault_id": "1039486483",\
                 "billing_id": "1408598861"\
                 "cc_number": "400000******0034",\
                 "cc_exp": "11/70",\
                 "first_name": "Jane",\
                 "last_name": "Smith",\
                 "email": "jane@organization.org",\
                 "phone": "+12125551222"\
            },\
            {\
                 "customer_vault_id": "1033346428",\
                 "billing_id": "1460247050",\
                 "cc_number": "520000******0007",\
                 "cc_exp": "12/33",\
                 "first_name": "Steve",\
                 "last_name": "Customer",\
                 "email": "steve@customer.com",\
                 "phone": "+13104053434"\
            }\
        ],
        "recurring_count_updated_cards": 2,
        "recurring_updated_cards": [\
            {\
                 "subscription_id": "281474976710720",\
                 "cc_number": "445701******0459",\
                 "cc_exp": "01/50",\
                 "first_name": "",\
                 "last_name": "",\
                 "email": "",\
                 "phone": ""\
            },\
            {\
                 "subscription_id": "281474976710726",\
                 "cc_number": "445701******1123",\
                 "cc_exp": "01/50",\
                 "first_name": "Frank",\
                 "last_name": "Jones",\
                 "email": "fjones@example.com",\
                 "phone": "6021234567"\
            }\
        ],
        "recurring_count_updated_expiration_dates": 1,
        "recurring_updated_expiration_dates": [\
            {\
                 "subscription_id": "281474976710725",\
                 "cc_number": "400000******3223",\
                 "cc_exp": "11/70",\
                 "first_name": "Susan",\
                 "last_name": "Harris",\
                 "email": "harris@company.com",\
                 "phone": "3125551212"\
            },\
        ]
    }
}


```

```json

{
   "event_id": "7bbd4af6-4075-4902-af56-9fc59ab71362",
   "event_type": "acu.summary.contactcustomer",
   "event_body": {
        "updated_date": "2022-08-23",
        "merchant": {
            "id": 123456,
            "name": "Test Account"
        },
        "cards_checked": {
            "customer_vault": {
                "checked": 123,
                "updated": 2
            },
            "subscriptions": {
                "checked": 232,
                "updated": 1
            }
        },
        "vault_count_updated_contact_customer": 2,
        "vault_updates": [\
            {\
                "customer_vault_id": "40403043545",\
                "billing_id": "34544356"\
                "cc_number": "445343******7432",\
                "cc_exp": "06/29",\
                "first_name": "Happy",\
                "last_name": "Customer",\
                "email": "frequent@shopper.com",\
                "phone": "5555559999",\
            },\
            {\
                "customer_vault_id": "281474976710722",\
                "billing_id": "230304034",\
                "cc_number": "434343******0123",\
                "cc_exp": "11/25",\
                "first_name": "Bill",\
                "last_name": "Thompson",\
                "email": "bill@anothercustomer.com",\
                "phone": "6025551213"\
            }\
        ],
        "recurring_count_updated_contact_customer": 1,
        "recurring_updates": [\
            {\
                "subscription_id": "323232232445",\
                "cc_number": "465333******4232",\
                "cc_exp": "04/30",\
                "first_name": "Recurring",\
                "last_name": "Customer",\
                "email": "buy@repeatedly.com",\
                "phone": "8185552323"\
            }\
        ]
    }
}


```

```json

{
   "event_id": "7bbd4af6-4075-4902-af56-9fc59ab71362",
   "event_type": "acu.summary.closedaccount",
   "event_body": {
        "updated_date": "2022-08-23",
        "merchant": {
            "id": 123456,
            "name": "Test Account"
        },
        "cards_checked": {
            "customer_vault": {
                "checked": 123,
                "updated": 1
            },
            "subscriptions": {
                "checked": 232,
                "updated": 1
            }
        },
        "vault_count_updated_closed_account": 1,
        "vault_updates": [\
            {\
                "customer_vault_id": "281474976710722",\
                "billing_id": "230304034",\
                "cc_number": "434343******0123",\
                "cc_exp": "11/25",\
                "first_name": "Longterm",\
                "last_name": "Client",\
                "email": "sample@customer.com",\
                "phone": "6025551213"\
            }\
        ],
        "recurring_count_updated_closed_account": 1,
        "recurring_updates": [\
            {\
                "subscription_id": "281474976710727",\
                "cc_number": "601101******0002",\
                "cc_exp": "11/32",\
                "first_name": "Bob",\
                "last_name": "Smith",\
                "email": "bsmith@example.co.uk",\
                "phone": "+440111122222"\
            }\
        ]
    }
}


```

# Integration Overview

There are multiple ways to incorporate the payment gateway within a website or mobile device. These options vary based upon ease of integration, required resources, features, and additional security.

### Marketplace

- [Kount](https://secure.easypaydirectgateway.com/gw/merchants/resources/integration/integration_portal.php#gjs_kount_gettingStarted)


### Transaction Request APIs

#### Payment API

- The Payment API method is the simplest integration method for both web-based and non web-based payment applications, however, merchants using this integration method should have passed a PCI vulnerability scan before use.


#### Collect.js

- Collect.js provides access to a popup form which securely captures payment data and generates a "token". The token is then used with the Payment API instead of raw credit card or bank account data. The popup form is technically a seperate page hosted by the gateway, so no payment information touches the merchant's site. This allows merchants to minimize their PCI-compliance footprint, with minimal changes to the customer experience.


#### Collect Checkout

- Collect Checkout is a hosted checkout page that can be integrated into most web-based payment workflows. The checkout page lives entirely on the gateway’s servers, ensuring that no payment data ever touches your environment.


#### EMV Chip Card SDK

- The EMV Chip Card SDKs are a set of software development kits, supporting Windows, Linux, iOS and Android, that abstracts the complexities of interfacing directly our supported hardware terminals.


#### Three-Step Redirect API

- The Three Step Redirect allows for payment processing on the web via an XML-based API. This is an older API and in general is only recommended for merchants who can not use the Payment API with Collect.js for some reason. This method is required when using Verified by Visa/Mastercard SecureCode (Payer Authentication).


### Transaction Retrieval API

#### Webhooks

- Webhooks allow merchants to receive next-to-real-time notifications of events happening on their account. While the Query API lets integrators “pull” information from the gateway, webhooks “push” information to the integrator.


#### Query API

- The Query API allows merchants to download a detailed stream of transaction data. This dataset can then be used to create in-house reports and analytics.


### Turnkey Shopping Carts

#### QuickClick Shopping Cart

- QuickClick is a great option for e-commerce merchants who do not have an IT team or developer on staff. A button-generator is included, which allows merchants to create website links to products and services without any previous development experience.


#### Third Party Shopping Carts

- There are a number of third party shopping carts that have integrated to the payment gateway. This is the best option for merchants who need a full featured turn-key shopping cart out of the box.