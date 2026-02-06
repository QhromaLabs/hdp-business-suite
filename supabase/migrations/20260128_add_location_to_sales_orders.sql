ALTER TABLE "public"."sales_orders" 
ADD COLUMN "latitude" double precision,
ADD COLUMN "longitude" double precision;

COMMENT ON COLUMN "public"."sales_orders"."latitude" IS 'Latitude of the location where the sale was made';
COMMENT ON COLUMN "public"."sales_orders"."longitude" IS 'Longitude of the location where the sale was made';
