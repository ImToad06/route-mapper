CREATE TABLE "geocodificacion_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"consulta" varchar(300) NOT NULL,
	"resultados" jsonb NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "geocodificacion_cache_consulta_unique" UNIQUE("consulta")
);
--> statement-breakpoint
ALTER TABLE "destino" ADD COLUMN "ubicacion_verificada" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "destino" ADD COLUMN "actualizado_en" timestamp with time zone DEFAULT now() NOT NULL;