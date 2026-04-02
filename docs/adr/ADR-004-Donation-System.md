# ADR 004: Implementación del Sistema de Donaciones (Escudo de Cancún)

## Estatus
Aceptado

## Contexto
MueveCancún es un proyecto de código abierto y gratuito para la comunidad. Sin embargo, el mantenimiento de servidores, la recolección de datos y el tiempo de desarrollo tienen un costo. Para asegurar la sustentabilidad a largo plazo sin comprometer la gratuidad para el usuario general, se propuso un modelo de donaciones voluntarias ("Guardianes").

## Decisión
Implementar una página de donaciones (/donate) y un sistema de "nudges" (avisos) no intrusivos dentro de la aplicación.
1. **Modelo de Tiers**:
   - **Libre**: Gratuito para siempre.
   - **Shield Guardian ($3/mes)**: Acceso a notificaciones y datos históricos.
   - **Nexus Architect ($10/mes)**: Participación en el roadmap y comunidad privada.
2. **In-App Nudge**: Un aviso que aparece después de 5 búsquedas exitosas para invitar al usuario a apoyar el proyecto.
3. **Página de Donaciones**: Una landing page que explica el impacto de las donaciones y los beneficios de cada tier.

## Consecuencias
- **Positivas**: Fuente de financiamiento para el proyecto, mayor compromiso de la comunidad, transparencia en el uso de recursos.
- **Negativas**: Necesidad de gestionar integraciones de pago (Stripe/Mercado Pago) en el futuro, mantenimiento de la lista de guardianes.
