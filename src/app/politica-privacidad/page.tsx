import type { Metadata } from "next"
import Link from "next/link"

import { Logo } from "@/components/logo"

export const metadata: Metadata = {
  title: "Política de Privacidad · Linkard",
  description:
    "Cómo Linkard recopila, usa y protege los datos personales de usuarios y visitantes de tarjetas.",
}

const ULTIMA_ACTUALIZACION = "25 de julio de 2026"

export default function PoliticaPrivacidadPage() {
  return (
    <div className="flex flex-1 flex-col bg-white dark:bg-black">
      <header className="mx-auto w-full max-w-3xl px-6 pt-6">
        <Logo />
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Política de Privacidad
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Última actualización: {ULTIMA_ACTUALIZACION}
        </p>

        <div className="mt-10 flex flex-col gap-8 text-sm leading-relaxed text-foreground">
          <section>
            <p>
              Esta Política de Privacidad describe cómo <strong>Linkard</strong>{" "}
              (accesible en <strong>linkard.mx</strong>, en adelante &ldquo;Linkard&rdquo;,
              &ldquo;nosotros&rdquo; o &ldquo;la plataforma&rdquo;) recopila, usa,
              almacena y protege los datos personales de las personas que usan el
              servicio (&ldquo;usuarios&rdquo;) y de quienes visitan las tarjetas
              públicas creadas en la plataforma (&ldquo;visitantes&rdquo;).
            </p>
            <p className="mt-3">
              Linkard es una plataforma tipo link-in-bio que permite crear una
              tarjeta de presentación digital con enlaces de contacto, agenda de
              servicios y venta de productos, compartible mediante un enlace y un
              código QR.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              1. Datos personales que recopilamos
            </h2>
            <p className="mt-2">Según cómo interactúes con Linkard, podemos recopilar:</p>
            <ul className="mt-3 flex flex-col gap-2 pl-5 [&>li]:list-disc">
              <li>
                <strong>Datos de cuenta:</strong> nombre, dirección de correo
                electrónico y foto de perfil, obtenidos a través del inicio de sesión
                con Google (OAuth).
              </li>
              <li>
                <strong>Datos de tu tarjeta:</strong> la información de contacto que
                tú mismo decides publicar (teléfono, WhatsApp, redes sociales,
                ubicación, catálogo de productos, descripción de servicios, colores e
                imágenes de tu identidad visual).
              </li>
              <li>
                <strong>Datos de pago:</strong> Linkard <strong>no almacena ni tiene
                acceso a los números de tarjeta de crédito o débito</strong>. El
                procesamiento del pago de suscripciones lo realiza directamente{" "}
                <strong>Stripe</strong>, y el de pagos únicos (citas y cobros
                puntuales) lo realiza <strong>Mercado Pago</strong>, ambos bajo sus
                propias políticas de seguridad y privacidad.
              </li>
              <li>
                <strong>Datos de visitantes de tarjetas públicas:</strong> registramos
                eventos de analítica agregados (por ejemplo, número de vistas de una
                tarjeta o clics en un enlace) para mostrarte estadísticas de uso.
                Estos eventos <strong>no incluyen datos que identifiquen
                personalmente</strong> a quien visita la tarjeta.
              </li>
              <li>
                <strong>Datos de clientes de tu agenda:</strong> si ofreces servicios
                agendables, quienes reservan una cita ingresan su nombre y un dato de
                contacto (teléfono o correo) para poder confirmarla — esta información
                pertenece a tu tarjeta y es tu responsabilidad como titular de la
                cuenta gestionarla conforme a esta misma política.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              2. Para qué usamos tus datos
            </h2>
            <ul className="mt-3 flex flex-col gap-2 pl-5 [&>li]:list-disc">
              <li>Crear y operar tu cuenta y tu tarjeta digital.</li>
              <li>Procesar el cobro de tu suscripción y de pagos asociados a tu tarjeta.</li>
              <li>Permitir que tus clientes agenden servicios o compren productos.</li>
              <li>Brindarte soporte técnico cuando lo solicites.</li>
              <li>
                Generar estadísticas agregadas de uso (vistas y clics) para que puedas
                ver el desempeño de tu tarjeta.
              </li>
              <li>Cumplir obligaciones legales y fiscales aplicables.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              3. Con quién compartimos tus datos
            </h2>
            <p className="mt-2">
              No vendemos tus datos personales. Los compartimos únicamente con los
              proveedores que hacen posible el funcionamiento de la plataforma, cada
              uno actuando como encargado de tratamiento en el ámbito que le
              corresponde:
            </p>
            <ul className="mt-3 flex flex-col gap-2 pl-5 [&>li]:list-disc">
              <li>
                <strong>Stripe</strong> — procesamiento de pagos de suscripciones
                recurrentes (mensuales o anuales).
              </li>
              <li>
                <strong>Mercado Pago</strong> — procesamiento de pagos de citas y de
                cobros manuales puntuales.
              </li>
              <li>
                <strong>Supabase</strong> — base de datos, autenticación e
                infraestructura de la plataforma. Su hosting principal se encuentra en
                Estados Unidos, por lo que tus datos pueden ser transferidos y
                almacenados fuera de México (ver sección 6).
              </li>
              <li>
                <strong>Google</strong> — autenticación mediante inicio de sesión con
                Google (OAuth).
              </li>
              <li>
                <strong>Cloudinary</strong> — almacenamiento de las imágenes que subes
                (foto de perfil, banners, fotos de producto, folletos).
              </li>
            </ul>
            <p className="mt-3">
              También podemos divulgar datos si una autoridad competente lo requiere
              conforme a la ley aplicable.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              4. Transferencia internacional de datos
            </h2>
            <p className="mt-2">
              Como algunos de nuestros proveedores (en particular Supabase, Stripe,
              Google y Cloudinary) operan con infraestructura fuera de México
              —principalmente en Estados Unidos—, tus datos personales pueden ser
              transferidos y tratados en otros países. Al usar Linkard, aceptas esta
              transferencia, que se realiza únicamente para los fines descritos en
              esta política y bajo los estándares de seguridad de cada proveedor.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              5. Uso de cookies
            </h2>
            <p className="mt-2">
              Linkard utiliza únicamente cookies esenciales para mantener tu sesión
              iniciada (a través de Supabase Auth). <strong>No utilizamos cookies de
              publicidad ni de rastreo de terceros.</strong>
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              6. Cómo protegemos tus datos
            </h2>
            <p className="mt-2">
              Aplicamos medidas técnicas y administrativas razonables para proteger
              tus datos, incluyendo control de acceso a nivel de base de datos
              (Row Level Security) y comunicación cifrada (HTTPS). Ningún sistema es
              100% infalible, pero trabajamos para mantener tu información segura.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              7. Derechos ARCO
            </h2>
            <p className="mt-2">
              De conformidad con la Ley Federal de Protección de Datos Personales en
              Posesión de los Particulares (LFPDPPP), tienes derecho a{" "}
              <strong>Acceder</strong> a tus datos personales, <strong>Rectificarlos</strong>{" "}
              si son inexactos, <strong>Cancelarlos</strong> cuando consideres que no se
              requieren para alguna de las finalidades señaladas, y <strong>Oponerte
              </strong> al tratamiento de los mismos para fines específicos (derechos
              ARCO).
            </p>
            <p className="mt-3">
              Para ejercer cualquiera de estos derechos, escríbenos a{" "}
              <a
                href="mailto:emuna.interno@gmail.com"
                className="font-medium text-foreground underline underline-offset-4"
              >
                emuna.interno@gmail.com
              </a>{" "}
              indicando tu solicitud. Responderemos en un plazo razonable.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              8. Cancelación de tu suscripción
            </h2>
            <p className="mt-2">
              Puedes cancelar tu suscripción en cualquier momento. Actualmente el
              proceso de cancelación se gestiona{" "}
              <strong>directamente por contacto con soporte</strong> (
              <a
                href="mailto:emuna.interno@gmail.com"
                className="font-medium text-foreground underline underline-offset-4"
              >
                emuna.interno@gmail.com
              </a>
              ), ya que todavía no existe una opción de autogestión dentro de la
              plataforma. Estamos trabajando para ofrecer esta opción directamente
              desde tu cuenta.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              9. Cambios a esta política
            </h2>
            <p className="mt-2">
              Podemos actualizar esta Política de Privacidad conforme evoluciona la
              plataforma. Publicaremos cualquier cambio en esta misma página con su
              fecha de actualización.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">10. Contacto</h2>
            <p className="mt-2">
              Si tienes dudas sobre esta política o el tratamiento de tus datos,
              escríbenos a{" "}
              <a
                href="mailto:emuna.interno@gmail.com"
                className="font-medium text-foreground underline underline-offset-4"
              >
                emuna.interno@gmail.com
              </a>
              .
            </p>
          </section>

          <p className="mt-4 text-xs text-muted-foreground">
            Este documento es un borrador inicial y será revisado con asesoría legal
            profesional próximamente.
          </p>
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
