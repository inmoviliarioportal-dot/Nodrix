/**
 * MVP single-tenant constants for the auth domain. There is only one
 * organization row during the MVP (see `database/schema.sql`), so every
 * write that needs an `org_id` uses this fixed value.
 */
export const MVP_ORG_ID = "00000000-0000-0000-0000-000000000001";
