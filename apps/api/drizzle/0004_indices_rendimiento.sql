CREATE INDEX "bitacora_fecha_hora_idx" ON "bitacora" USING btree ("fecha_hora");--> statement-breakpoint
CREATE INDEX "bitacora_usuario_id_idx" ON "bitacora" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "notificacion_usuario_id_idx" ON "notificacion" USING btree ("usuario_id","creado_en");--> statement-breakpoint
CREATE INDEX "parada_producto_producto_id_idx" ON "parada_producto" USING btree ("producto_id");--> statement-breakpoint
CREATE INDEX "ruta_fecha_idx" ON "ruta" USING btree ("fecha");--> statement-breakpoint
CREATE INDEX "ruta_conductor_id_idx" ON "ruta" USING btree ("conductor_id");--> statement-breakpoint
CREATE INDEX "ruta_estado_idx" ON "ruta" USING btree ("estado");--> statement-breakpoint
CREATE INDEX "ruta_historial_ruta_id_idx" ON "ruta_historial_estado" USING btree ("ruta_id","fecha_hora");--> statement-breakpoint
CREATE INDEX "ruta_parada_destino_id_idx" ON "ruta_parada" USING btree ("destino_id");