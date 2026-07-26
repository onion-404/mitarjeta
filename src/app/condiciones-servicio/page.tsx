import type { Metadata } from "next"
import Link from "next/link"

import { Logo } from "@/components/logo"

export const metadata: Metadata = {
  title: "Condiciones de Servicio · Linkard",
  description:
    "Términos y condiciones de uso de Linkard: cuentas, planes de suscripción, pagos y responsabilidades.",
}

const ULTIMA_ACTUALIZACION = "25 de julio de 2026"

export default function CondicionesServicioPage() {
  return (
    <div className="flex flex-1 flex-col bg-white dark:bg-black">
      <header className="mx-auto w-full max-w-3xl px-6 pt-6">
        <Logo />
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Condiciones de Servicio
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Última actualización: {ULTIMA_ACTUALIZACION}
        </p>

        <div className="mt-10 flex flex-col gap-8 text-sm leading-relaxed text-foreground">
          <section>
            <p>
              Estas Condiciones de Servicio (&ldquo;Términos&rdquo;) rigen el uso de{" "}
              <strong>Linkard</strong> (<strong>linkard.mx</strong>), una plataforma
              tipo link-in-bio que permite crear una tarjeta de presentación digital
              con enlaces de contacto, agenda de servicios y venta de productos. Al
              crear una cuenta o usar Linkard, aceptas estos Términos.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              1. Descripción del servicio
            </h2>
            <p className="mt-2">
              Linkard te permite crear una o más tarjetas digitales, cada una con su
              propio plan y suscripción, compartibles mediante un enlace y un código
              QR. Según el plan contratado, una tarjeta puede incluir agenda de
              servicios con reservación de citas y catálogo de productos.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              2. Cuentas
            </h2>
            <p className="mt-2">
              Para crear una tarjeta necesitas una cuenta autenticada (actualmente
              mediante inicio de sesión con Google). Eres responsable de la veracidad
              de la información que publiques en tu tarjeta y de mantener la
              confidencialidad de tu acceso.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              3. Planes y suscripciones
            </h2>
            <p className="mt-2">
              Linkard ofrece planes de pago (sin nivel gratuito). Cada tarjeta tiene
              su propio plan y su propia suscripción, independiente de las demás
              tarjetas que puedas tener. Las suscripciones se cobran de forma{" "}
              <strong>recurrente, mensual o anual</strong>, según la periodicidad que
              elijas, y se renuevan automáticamente al finalizar cada periodo hasta
              que se cancelen.
            </p>
            <p className="mt-3">
              <strong>Cancelación:</strong> puedes cancelar tu suscripción en cualquier
              momento. Hoy, ese proceso se realiza{" "}
              <strong>contactando a soporte</strong> (
              <a
                href="mailto:emuna.interno@gmail.com"
                className="font-medium text-foreground underline underline-offset-4"
              >
                emuna.interno@gmail.com
              </a>
              ), ya que todavía no ofrecemos una opción de autogestión dentro de la
              plataforma para cancelar directamente desde tu cuenta. Estamos
              trabajando para habilitarla. La cancelación detiene los cobros futuros;
              no genera reembolsos de periodos ya cobrados salvo que se indique lo
              contrario expresamente.
            </p>
            <p className="mt-3">
              Si una suscripción no se renueva o el pago es rechazado, las funciones
              asociadas al plan (por ejemplo, la agenda de servicios) pueden quedar
              deshabilitadas para esa tarjeta hasta que se regularice el pago.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              4. Pagos
            </h2>
            <p className="mt-2">
              El cobro recurrente de tu suscripción se procesa a través de{" "}
              <strong>Stripe</strong>. Los pagos únicos —como el pago opcional de una
              cita o un cobro manual puntual— se procesan a través de{" "}
              <strong>Mercado Pago</strong>.{" "}
              <strong>
                Linkard no almacena ni tiene acceso a los datos de tu tarjeta de
                crédito o débito
              </strong>{" "}
              en ningún momento: la captura de esos datos ocurre directamente en la
              plataforma del proveedor de pago correspondiente.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              5. Contenido del usuario
            </h2>
            <p className="mt-2">
              Eres responsable del contenido que publiques en tu tarjeta (textos,
              imágenes, catálogo de productos, información de servicios). No debes
              publicar contenido ilegal, fraudulento, engañoso o que infrinja derechos
              de terceros. Linkard puede suspender o eliminar contenido o cuentas que
              incumplan esta condición.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              6. Agenda de servicios y ventas
            </h2>
            <p className="mt-2">
              Si usas la agenda de servicios, eres el único responsable de cumplir con
              las citas confirmadas y con la calidad de los servicios o productos que
              ofrezcas. Linkard actúa únicamente como intermediario tecnológico que
              facilita la reservación y, en su caso, el cobro; no es parte de la
              relación comercial entre tú y tus clientes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              7. Propiedad intelectual
            </h2>
            <p className="mt-2">
              La marca Linkard, su diseño y su código son propiedad de sus
              operadores. Tú conservas los derechos sobre el contenido que subas a tu
              tarjeta; al publicarlo, nos otorgas la licencia necesaria para
              almacenarlo y mostrarlo públicamente conforme a tu configuración de
              privacidad.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              8. Terminación del servicio
            </h2>
            <p className="mt-2">
              Podemos suspender o cancelar tu acceso si incumples estos Términos, sin
              perjuicio de otras acciones que correspondan. Puedes dejar de usar
              Linkard en cualquier momento; la cancelación de tu suscripción se rige
              por la sección 3.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              9. Limitación de responsabilidad
            </h2>
            <p className="mt-2">
              Linkard se ofrece &ldquo;tal cual&rdquo;. En la medida permitida por la
              ley, no somos responsables por interrupciones del servicio,
              pérdida de datos, ni por disputas comerciales entre usuarios y sus
              clientes derivadas del uso de la agenda o del catálogo de productos.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              10. Modificaciones a estos Términos
            </h2>
            <p className="mt-2">
              Podemos actualizar estos Términos conforme evoluciona la plataforma.
              Publicaremos cualquier cambio en esta misma página con su fecha de
              actualización. El uso continuado de Linkard después de un cambio
              implica su aceptación.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              11. Ley aplicable
            </h2>
            <p className="mt-2">
              Estos Términos se rigen por las leyes de los Estados Unidos Mexicanos.
              Para el tratamiento de datos personales aplica, en particular, la Ley
              Federal de Protección de Datos Personales en Posesión de los
              Particulares.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">12. Contacto</h2>
            <p className="mt-2">
              Si tienes dudas sobre estos Términos, escríbenos a{" "}
              <a
                href="mailto:emuna.interno@gmail.com"
                className="font-medium text-foreground underline underline-offset-4"
              >
                emuna.interno@gmail.com
              </a>
              .
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-border/60 py-6 text-center">
        <Link
          href="/"
          className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Volver al inicio
        </Link>
      </footer>
    </div>
  )
}
