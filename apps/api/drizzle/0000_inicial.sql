CREATE TYPE "public"."disponibilidad_conductor" AS ENUM('disponible', 'en_ruta', 'inactivo');--> statement-breakpoint
CREATE TYPE "public"."estado_parada" AS ENUM('pendiente', 'entregada', 'fallida');--> statement-breakpoint
CREATE TYPE "public"."estado_ruta" AS ENUM('borrador', 'planificada', 'pendiente_aceptacion', 'asignada', 'en_curso', 'completada', 'incompleta', 'cancelada');--> statement-breakpoint
CREATE TYPE "public"."rol_nombre" AS ENUM('administrador', 'coordinador', 'conductor');--> statement-breakpoint
CREATE TYPE "public"."tipo_novedad" AS ENUM('cliente_ausente', 'rechazo_mercancia', 'direccion_incorrecta', 'devolucion_parcial', 'otro');--> statement-breakpoint
CREATE TYPE "public"."unidad_medida" AS ENUM('unidad', 'caja', 'paquete', 'kg', 'litro');--> statement-breakpoint
CREATE TABLE "bitacora" (
	"id" serial PRIMARY KEY NOT NULL,
	"usuario_id" integer,
	"accion" varchar(40) NOT NULL,
	"entidad" varchar(40) NOT NULL,
	"entidad_id" integer,
	"descripcion" text NOT NULL,
	"fecha_hora" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notificacion" (
	"id" serial PRIMARY KEY NOT NULL,
	"usuario_id" integer NOT NULL,
	"tipo" varchar(40) NOT NULL,
	"titulo" varchar(120) NOT NULL,
	"cuerpo" varchar(500) NOT NULL,
	"ruta_id" integer,
	"leida_en" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conductor" (
	"id" serial PRIMARY KEY NOT NULL,
	"usuario_id" integer NOT NULL,
	"nombre" varchar(120) NOT NULL,
	"documento" varchar(30) NOT NULL,
	"licencia" varchar(30) NOT NULL,
	"telefono" varchar(30),
	"disponibilidad" "disponibilidad_conductor" DEFAULT 'disponible' NOT NULL,
	"vehiculo_id" integer,
	"activo" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "conductor_usuarioId_unique" UNIQUE("usuario_id"),
	CONSTRAINT "conductor_documento_unique" UNIQUE("documento")
);
--> statement-breakpoint
CREATE TABLE "configuracion" (
	"clave" varchar(60) PRIMARY KEY NOT NULL,
	"valor" varchar(500) NOT NULL,
	"descripcion" varchar(255),
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "destino" (
	"id" serial PRIMARY KEY NOT NULL,
	"zona_id" integer NOT NULL,
	"nombre_cliente" varchar(120) NOT NULL,
	"direccion" varchar(255) NOT NULL,
	"horario_atencion" varchar(120),
	"telefono" varchar(30),
	"latitud" double precision NOT NULL,
	"longitud" double precision NOT NULL,
	"geocodificado_manual" boolean DEFAULT false NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "producto" (
	"id" serial PRIMARY KEY NOT NULL,
	"codigo" varchar(40) NOT NULL,
	"descripcion" varchar(160) NOT NULL,
	"unidad_medida" "unidad_medida" DEFAULT 'unidad' NOT NULL,
	"peso_kg" numeric(10, 3) NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "producto_codigo_unique" UNIQUE("codigo"),
	CONSTRAINT "producto_peso_no_negativo" CHECK ("producto"."peso_kg" >= 0)
);
--> statement-breakpoint
CREATE TABLE "vehiculo" (
	"id" serial PRIMARY KEY NOT NULL,
	"placa" varchar(10) NOT NULL,
	"tipo" varchar(60) NOT NULL,
	"capacidad_kg" numeric(10, 2) NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vehiculo_placa_unique" UNIQUE("placa"),
	CONSTRAINT "vehiculo_capacidad_positiva" CHECK ("vehiculo"."capacidad_kg" > 0)
);
--> statement-breakpoint
CREATE TABLE "zona" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" varchar(80) NOT NULL,
	"descripcion" varchar(255),
	"activo" boolean DEFAULT true NOT NULL,
	CONSTRAINT "zona_nombre_unique" UNIQUE("nombre")
);
--> statement-breakpoint
CREATE TABLE "parada_producto" (
	"id" serial PRIMARY KEY NOT NULL,
	"ruta_parada_id" integer NOT NULL,
	"producto_id" integer NOT NULL,
	"cantidad" numeric(10, 2) NOT NULL,
	CONSTRAINT "parada_producto_unico" UNIQUE("ruta_parada_id","producto_id"),
	CONSTRAINT "parada_producto_cantidad_positiva" CHECK ("parada_producto"."cantidad" > 0)
);
--> statement-breakpoint
CREATE TABLE "ruta" (
	"id" serial PRIMARY KEY NOT NULL,
	"codigo" varchar(30) NOT NULL,
	"fecha" date NOT NULL,
	"estado" "estado_ruta" DEFAULT 'borrador' NOT NULL,
	"conductor_id" integer,
	"vehiculo_id" integer,
	"creado_por" integer NOT NULL,
	"observaciones" text,
	"distancia_m" integer,
	"duracion_s" integer,
	"geometria" text,
	"optimizada_en" timestamp with time zone,
	"asignada_en" timestamp with time zone,
	"aceptada_en" timestamp with time zone,
	"iniciada_en" timestamp with time zone,
	"finalizada_en" timestamp with time zone,
	"motivo_rechazo" varchar(255),
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ruta_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE "ruta_historial_estado" (
	"id" serial PRIMARY KEY NOT NULL,
	"ruta_id" integer NOT NULL,
	"parada_id" integer,
	"estado_anterior" varchar(30),
	"estado_nuevo" varchar(30) NOT NULL,
	"usuario_id" integer,
	"nota" varchar(500),
	"fecha_hora" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ruta_parada" (
	"id" serial PRIMARY KEY NOT NULL,
	"ruta_id" integer NOT NULL,
	"destino_id" integer NOT NULL,
	"orden" integer NOT NULL,
	"estado_entrega" "estado_parada" DEFAULT 'pendiente' NOT NULL,
	"hora_confirmacion" timestamp with time zone,
	"novedad_tipo" "tipo_novedad",
	"novedad_nota" varchar(500),
	"eta_s" integer,
	"distancia_desde_anterior_m" integer,
	CONSTRAINT "ruta_parada_orden_unico" UNIQUE("ruta_id","orden"),
	CONSTRAINT "ruta_parada_destino_unico" UNIQUE("ruta_id","destino_id"),
	CONSTRAINT "ruta_parada_orden_positivo" CHECK ("ruta_parada"."orden" >= 1)
);
--> statement-breakpoint
CREATE TABLE "intento_acceso" (
	"id" serial PRIMARY KEY NOT NULL,
	"correo" varchar(160) NOT NULL,
	"exito" boolean NOT NULL,
	"ip" varchar(64),
	"user_agent" varchar(255),
	"fecha_hora" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rol" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" "rol_nombre" NOT NULL,
	CONSTRAINT "rol_nombre_unique" UNIQUE("nombre")
);
--> statement-breakpoint
CREATE TABLE "sesion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" integer NOT NULL,
	"refresh_token_hash" varchar(255) NOT NULL,
	"user_agent" varchar(255),
	"ip" varchar(64),
	"expira_en" timestamp with time zone NOT NULL,
	"revocada_en" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usuario" (
	"id" serial PRIMARY KEY NOT NULL,
	"rol_id" integer NOT NULL,
	"nombre" varchar(120) NOT NULL,
	"correo" varchar(160) NOT NULL,
	"contrasena_hash" varchar(255) NOT NULL,
	"debe_cambiar_contrasena" boolean DEFAULT false NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuario_correo_unique" UNIQUE("correo")
);
--> statement-breakpoint
ALTER TABLE "bitacora" ADD CONSTRAINT "bitacora_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notificacion" ADD CONSTRAINT "notificacion_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notificacion" ADD CONSTRAINT "notificacion_ruta_id_ruta_id_fk" FOREIGN KEY ("ruta_id") REFERENCES "public"."ruta"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conductor" ADD CONSTRAINT "conductor_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conductor" ADD CONSTRAINT "conductor_vehiculo_id_vehiculo_id_fk" FOREIGN KEY ("vehiculo_id") REFERENCES "public"."vehiculo"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "destino" ADD CONSTRAINT "destino_zona_id_zona_id_fk" FOREIGN KEY ("zona_id") REFERENCES "public"."zona"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parada_producto" ADD CONSTRAINT "parada_producto_ruta_parada_id_ruta_parada_id_fk" FOREIGN KEY ("ruta_parada_id") REFERENCES "public"."ruta_parada"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parada_producto" ADD CONSTRAINT "parada_producto_producto_id_producto_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."producto"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ruta" ADD CONSTRAINT "ruta_conductor_id_conductor_id_fk" FOREIGN KEY ("conductor_id") REFERENCES "public"."conductor"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ruta" ADD CONSTRAINT "ruta_vehiculo_id_vehiculo_id_fk" FOREIGN KEY ("vehiculo_id") REFERENCES "public"."vehiculo"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ruta" ADD CONSTRAINT "ruta_creado_por_usuario_id_fk" FOREIGN KEY ("creado_por") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ruta_historial_estado" ADD CONSTRAINT "ruta_historial_estado_ruta_id_ruta_id_fk" FOREIGN KEY ("ruta_id") REFERENCES "public"."ruta"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ruta_historial_estado" ADD CONSTRAINT "ruta_historial_estado_parada_id_ruta_parada_id_fk" FOREIGN KEY ("parada_id") REFERENCES "public"."ruta_parada"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ruta_historial_estado" ADD CONSTRAINT "ruta_historial_estado_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ruta_parada" ADD CONSTRAINT "ruta_parada_ruta_id_ruta_id_fk" FOREIGN KEY ("ruta_id") REFERENCES "public"."ruta"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ruta_parada" ADD CONSTRAINT "ruta_parada_destino_id_destino_id_fk" FOREIGN KEY ("destino_id") REFERENCES "public"."destino"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sesion" ADD CONSTRAINT "sesion_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_rol_id_rol_id_fk" FOREIGN KEY ("rol_id") REFERENCES "public"."rol"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ruta_conductor_fecha_activa_idx" ON "ruta" USING btree ("conductor_id","fecha") WHERE "ruta"."estado" NOT IN ('completada', 'incompleta', 'cancelada');