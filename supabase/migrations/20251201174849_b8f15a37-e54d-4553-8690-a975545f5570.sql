-- Fix function search paths for new order-related functions
ALTER FUNCTION generate_short_order_id() SET search_path = public;
ALTER FUNCTION set_order_short_id() SET search_path = public;
ALTER FUNCTION generate_bank_reference() SET search_path = public;
ALTER FUNCTION set_bank_reference() SET search_path = public;
ALTER FUNCTION track_order_status_change() SET search_path = public;
ALTER FUNCTION update_promo_usage() SET search_path = public;