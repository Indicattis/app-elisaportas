ALTER PUBLICATION supabase_realtime ADD TABLE public.user_route_access;
ALTER TABLE public.user_route_access REPLICA IDENTITY FULL;