# Data Dictionary — VIP Sales Data

**File**: `public/sales_data/data.xlsx`
**Sheet name**: `VIP`
**Row count**: 788 records

## Columns

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `OnOff Premises` | String | Whether the retail account sells for on-premises or off-premises consumption | `OFF`, `ON` |
| `Retail Accounts` | String | Name of the retail account / store | `USA WINE TRADERS CLUB` |
| `Address` | String | Street address of the account | `66 MARKET ST` |
| `City` | String | City | `SADDLE BROOK` |
| `State` | String | US state abbreviation | `NJ`, `GA` |
| `Zip Code` | String or Number | ZIP code (may be numeric or string depending on leading zeros) | `07663`, `30024` |
| `Phone` | Number | Phone number as a raw number (no formatting) | `2018809447` |
| `12 Months 3/1/2025 thru 2/21/2026  First Buy Date` | Excel Serial Date | First purchase date in the 12-month window. Stored as an Excel serial number. | `45779` (= 2025-05-01) |
| `12 Months 3/1/2025 thru 2/21/2026  Last Buy Date` | Excel Serial Date | Last purchase date in the 12-month window. Stored as an Excel serial number. | `45846` (= 2025-07-07) |

## Important Notes

- **Date columns** are stored as Excel serial numbers, NOT as date strings. To convert: `new Date((serial - 25569) * 86400000)` in JS, or `pd.to_datetime(serial, unit='D', origin='1899-12-30')` in pandas.
- **Zip Code** may lose leading zeros when parsed as a number (e.g., `07663` becomes `7663`). Always treat as string for display.
- **Phone** is a raw number with no dashes or formatting. Format for display as needed.
- Column names with spaces and special characters should be handled carefully in code (use bracket notation in JS, quoted column names in pandas).
