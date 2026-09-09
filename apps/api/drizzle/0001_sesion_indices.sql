CREATE UNIQUE INDEX "sesion_refresh_token_hash_idx" ON "sesion" USING btree ("refresh_token_hash");--> statement-breakpoint
CREATE INDEX "sesion_usuario_id_idx" ON "sesion" USING btree ("usuario_id");