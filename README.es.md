# Pointage Carrière

**Control de asistencia sin conexión para plantas de trituración y lavado de arena.** Un toque por empleado en el teléfono, con o sin cobertura, y un archivo Excel limpio para la nómina a final de mes.

[ⵜⴰⵎⴰⵣⵉⵖⵜ](README.zgh.md) · [العربية](README.ar.md) · [Français](README.fr.md) · [English](README.md) · **Español**

<p>
  <img src="docs/screenshots/phone-es.png" alt="Pantalla de fichaje en español" width="24%">
  <img src="docs/screenshots/phone-languages.png" alt="Selección de idioma" width="24%">
  <img src="docs/screenshots/phone-ar.png" alt="Pantalla de fichaje en árabe" width="24%">
  <img src="docs/screenshots/phone-employee.png" alt="Ficha de empleado" width="24%">
</p>

## Qué es

En la mayoría de las plantas de trituración de la región de Marrakech, la asistencia se apunta en un cuaderno y luego se vuelve a teclear en una hoja de cálculo que solo entiende una persona. Se pierden páginas, los totales fallan a la tercera copia y la nómina se discute a final de mes.

Pointage Carrière sustituye al cuaderno. El jefe de planta lo abre en su teléfono, toca una vez a cada empleado y el fichaje queda guardado en el dispositivo. A final de mes, un botón genera el archivo Excel que necesita el contable. Funciona en el fondo de un cauce sin cobertura, con polvo y con guantes.

Es un producto pequeño y completo, publicado en abierto como ejemplo de cómo trabaja MeskikCode: alcance fijo, hecho para quienes lo usan y que funciona donde se trabaja.

**Demostración:** https://meskikcode.github.io/quarry-pointage-lite/ (abrir en un teléfono e instalar).

## Qué hace

- **Todos presentes con un toque.** La mayoría de los días casi todos están. Un botón marca presente a toda la plantilla (o a un solo equipo) y se corrigen las pocas excepciones. Se puede deshacer y nunca sobrescribe a quien ya está fichado.
- **Fichaje con un toque.** Presente, media jornada, retraso o ausente, en una sola fila de botones grandes. Una ausencia lleva un motivo: injustificada, enfermedad o autorizada. Un segundo toque sobre el estado elegido lo borra.
- **El mes de un vistazo.** Por empleado: días trabajados, ausencias, horas extra y lo que se debe pagar, con el total del mes, en la aplicación y no solo en el archivo Excel.
- **Turnos de día y de noche**, cada uno con sus fichajes, en cualquier fecha.
- **Horas extra** por empleado y por turno: un botón «+1 h» que abre un contador cuando hay horas que ajustar.
- **La plantilla real de una planta.** Jefe de trituración, jefe de maquinaria, contable, electricista-operador, soldador, conductores de cargadora, excavadora y camión, obreros y vigilantes. Cualquier otro puesto (surtidor de gasóleo, agente de báscula, almacenero) se introduce con su propio nombre, porque no hay dos plantas con la misma plantilla.
- **Dos formas de pago**, como en el terreno:
  - *Mensual*: con contrato. El salario se debe por el mes aunque falten días, y las horas extra se pagan.
  - *Por día*: se paga por día trabajado. Las horas extra solo se pagan si se indica una tarifa por hora.
- **Anticipos.** El dinero entregado antes del día de pago se anota por empleado, con fecha y nota, y se descuenta de lo pendiente de pago. Un saldo negativo aparece en rojo.
- **Exportación mensual a Excel, lista para el contable.** Tres hojas: un resumen por empleado (días trabajados, ausencias, horas extra, salario base, paga estimada, anticipos, pendiente de pago), todos los fichajes y todos los anticipos. Con título, encabezado fijo, números y fechas reales, fila de totales e impresión apaisada. Es una ayuda para preparar la nómina, no una declaración a la CNSS.
- **Copia de seguridad y restauración.** Los datos solo existen en el dispositivo: toda la base se guarda en un archivo y se restaura desde él.
- **Cinco idiomas**: tamazight (tifinagh), árabe (de derecha a izquierda), francés, inglés y español.
- **Instalable y totalmente sin conexión.** Tras la primera visita arranca sin ninguna red.
- **Todos los tamaños de pantalla**, desde un teléfono de 320 px hasta un monitor de escritorio.

## Privacidad

No hay cuenta, ni servidor, ni analítica. La aplicación no hace ninguna petición a terceros: fuentes, iconos y la biblioteca de Excel van incluidos. Los nombres, los documentos de identidad y los salarios permanecen en la base del navegador, en el dispositivo, y solo salen en los archivos que exporta el usuario.

## Instalar en un teléfono

1. Abrir la demostración en Chrome en Android (o Safari en iPhone).
2. Chrome: menú y **Añadir a pantalla de inicio** o **Instalar aplicación**. Safari: Compartir y **Añadir a pantalla de inicio**.
3. Abrirla desde la pantalla de inicio. A partir de ahí funciona sin conexión.

La plantilla que aparece en el primer arranque es ficticia. Editar o desactivar esas fichas e introducir la plantilla real.

## Ejecutar en local

Requiere Node.js 22.12 o posterior.

```bash
git clone https://github.com/MeskikCode/quarry-pointage-lite.git
cd quarry-pointage-lite
npm install
npm run dev
```

La documentación técnica está en inglés: [diseño del sistema](docs/system-design.md), [modelo de datos](docs/data-model.md), [sistema de diseño](docs/design-system.md), [traducciones](docs/translations.md).

## Fuera de esta edición

Esta edición abierta es reducida a propósito. Se desarrollan para clientes, como proyecto privado:

- la sincronización entre varios teléfonos y un panel en la oficina cuando vuelve la red;
- el enlace entre turnos, tiques de báscula y tonelaje producido;
- la nómina completa: retenciones, préstamos a varios meses y recibos de salario impresos.

## Proyectos a medida

MeskikCode desarrolla software a medida para empresas de industria, construcción y salud, en Marruecos, África y más allá: de hojas de cálculo frágiles a un único sistema seguro, a un precio fijo acordado antes de empezar.

- Sitio web: https://meskikcode.com
- Correo: abdelmalek@meskik.com
- Teléfono y WhatsApp: +212 657 89 01 84 · https://wa.me/212657890184
- LinkedIn: https://www.linkedin.com/company/meskikcode/

## Licencia

El código se publica bajo la [licencia MIT](LICENSE), copyright Abdelmalek MESKIK. El nombre y el logotipo de MeskikCode no están cubiertos por esa licencia.

---

Creado en Marrakech, primero para Marruecos, luego para África, la región MENA, Europa y el mundo.
MeskikCode — nombre comercial de Abdelmalek MESKIK. *Your Vision, Our Passion.*
