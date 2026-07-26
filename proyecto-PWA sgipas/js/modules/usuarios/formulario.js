        } else {
            if (!email || !password) throw new Error('Correo y contraseña obligatorios.');
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: { data: { nombre_completo: nombre, departamento, rol } }
            });
            if (error) {
                console.error('Error signUp:', error);
                throw new Error(error.message || error.error_description || 'Error al registrar');
            }
            // Trigger handle_new_user se encarga del perfil, pero nos aseguramos por si acaso
            await supabase.from('perfiles').upsert({
                id: data.user.id,
                nombre_completo: nombre,
                email,
                departamento,
                rol,
                estado: true
            });
        }