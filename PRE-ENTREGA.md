# Pre-Entrega

Checklist simple para probar la app antes de darsela a un usuario real.

## Acceso

- Abrir la app y confirmar que aparece la pantalla de ingreso.
- Si es primera vez, crear usuario administrador y clave.
- Cerrar sesion y volver a entrar para validar el login.

## Operacion diaria

- Crear una venta nueva con fecha futura y verificar que la cuota 1 no figure como cobrada.
- Cobrar una cuota desde el panel de vencimientos.
- Generar un aviso y copiar/enviar el mensaje.
- Revisar que el registro cambie de estado correctamente.

## Persistencia

- Cerrar la app o recargar la pagina.
- Volver a entrar y confirmar que las ventas siguen presentes.
- Exportar un respaldo JSON.
- Importar ese respaldo en una prueba y verificar que recupere los datos.
- Probar importar una planilla CSV guardada desde Excel.
- Descargar y revisar la plantilla de importacion para usar siempre ese formato.

## Exportaciones

- Exportar CSV y abrirlo en Excel.
- Exportar PDF y verificar que no quede cortado ni vacio.
- Confirmar que los filtros del modal de exportacion afectan el contenido exportado.

## Mobile

- Probar en un celular o en modo responsive.
- Verificar que la barra inferior no tape botones.
- Confirmar que el preview del comprobante se pueda scrollear bien.
- Abrir y cerrar el drawer lateral.

## Respaldo recomendado

- Guardar un respaldo JSON al menos una vez por semana.
- Guardar una copia extra antes de importar datos o hacer cambios grandes.
