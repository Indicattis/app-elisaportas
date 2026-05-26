DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_representante();

DELETE FROM public.representantes
WHERE id = 'b26c65ad-006f-4f25-9d8a-02162d87d33a';