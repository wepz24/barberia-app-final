-- Actualizar precios a pesos chilenos y eliminar servicio premium
UPDATE public.services_2025_12_05_15_37 
SET price = 10000 
WHERE name = 'Corte de Cabello Clásico';

UPDATE public.services_2025_12_05_15_37 
SET price = 25000 
WHERE name = 'Corte + Barba';

UPDATE public.services_2025_12_05_15_37 
SET price = 12000 
WHERE name = 'Solo Barba';

UPDATE public.services_2025_12_05_15_37 
SET price = 10000 
WHERE name = 'Corte Niño';

-- Eliminar servicio premium
DELETE FROM public.services_2025_12_05_15_37 
WHERE name = 'Corte Premium';

-- Crear tabla para usuarios administradores (barberos)
CREATE TABLE public.admin_users_2025_12_05_15_37 (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(20) DEFAULT 'barber',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insertar usuario barbero por defecto (password: barbero123)
INSERT INTO public.admin_users_2025_12_05_15_37 (email, password_hash, name) VALUES
('barbero@barberia.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Barbero Principal');

-- Habilitar RLS para admin_users
ALTER TABLE public.admin_users_2025_12_05_15_37 ENABLE ROW LEVEL SECURITY;

-- Política para admin_users (solo lectura para autenticación)
CREATE POLICY "Admin login access" ON public.admin_users_2025_12_05_15_37
  FOR SELECT USING (active = true);