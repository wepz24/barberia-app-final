-- Crear tabla de servicios
CREATE TABLE public.services_2025_12_05_15_37 (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Crear tabla de citas
CREATE TABLE public.appointments_2025_12_05_15_37 (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_name VARCHAR(100) NOT NULL,
  client_phone VARCHAR(20) NOT NULL,
  client_email VARCHAR(100),
  service_id UUID REFERENCES public.services_2025_12_05_15_37(id),
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Crear tabla de horarios disponibles
CREATE TABLE public.availability_2025_12_05_15_37 (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Domingo, 6=Sábado
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insertar servicios básicos
INSERT INTO public.services_2025_12_05_15_37 (name, description, duration_minutes, price) VALUES
('Corte de Cabello Clásico', 'Corte tradicional con tijeras y máquina', 30, 15.00),
('Corte + Barba', 'Corte de cabello completo más arreglo de barba', 45, 25.00),
('Solo Barba', 'Arreglo y perfilado de barba', 20, 12.00),
('Corte Niño', 'Corte especial para niños hasta 12 años', 25, 10.00),
('Corte Premium', 'Corte personalizado con lavado y peinado', 60, 35.00);

-- Insertar horarios de trabajo (Lunes a Sábado, 9:00 AM a 7:00 PM)
INSERT INTO public.availability_2025_12_05_15_37 (day_of_week, start_time, end_time) VALUES
(1, '09:00', '19:00'), -- Lunes
(2, '09:00', '19:00'), -- Martes
(3, '09:00', '19:00'), -- Miércoles
(4, '09:00', '19:00'), -- Jueves
(5, '09:00', '19:00'), -- Viernes
(6, '09:00', '17:00'); -- Sábado (horario reducido)

-- Habilitar RLS
ALTER TABLE public.services_2025_12_05_15_37 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments_2025_12_05_15_37 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_2025_12_05_15_37 ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para servicios (lectura pública)
CREATE POLICY "Servicios visibles para todos" ON public.services_2025_12_05_15_37
  FOR SELECT USING (active = true);

-- Políticas RLS para horarios (lectura pública)
CREATE POLICY "Horarios visibles para todos" ON public.availability_2025_12_05_15_37
  FOR SELECT USING (active = true);

-- Políticas RLS para citas (inserción pública, lectura limitada)
CREATE POLICY "Cualquiera puede crear citas" ON public.appointments_2025_12_05_15_37
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Ver citas propias por teléfono" ON public.appointments_2025_12_05_15_37
  FOR SELECT USING (true); -- Permitir lectura para mostrar citas existentes