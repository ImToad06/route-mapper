import {
  actualizarUsuarioSchema,
  cambiarEstadoUsuarioSchema,
  crearUsuarioSchema,
  idSchema,
  listarUsuariosSchema,
} from '@lh/shared'
import { Elysia } from 'elysia'
import { z } from 'zod'
import { autenticacion } from '../../plugins/auth.ts'
import * as servicio from './usuarios.service.ts'

const params = z.object({ id: idSchema })

export const usuariosController = new Elysia({ prefix: '/usuarios', tags: ['Usuarios'] })
  .use(autenticacion)
  .guard({ roles: ['administrador'] })
  .get('/', ({ query }) => servicio.listarUsuarios(query), {
    query: listarUsuariosSchema,
    detail: { summary: 'Listar usuarios (paginado, con búsqueda y filtros)' },
  })
  .get('/:id', ({ params: { id } }) => servicio.obtenerUsuario(id), {
    params,
    detail: { summary: 'Obtener un usuario' },
  })
  .post(
    '/',
    async ({ body, usuario, set }) => {
      set.status = 201
      return servicio.crearUsuario(body, usuario)
    },
    { body: crearUsuarioSchema, detail: { summary: 'Crear usuario (RF-25)' } },
  )
  .patch(
    '/:id',
    ({ params: { id }, body, usuario }) => servicio.actualizarUsuario(id, body, usuario),
    {
      params,
      body: actualizarUsuarioSchema,
      detail: { summary: 'Actualizar nombre, correo o rol' },
    },
  )
  .patch(
    '/:id/estado',
    ({ params: { id }, body, usuario }) => servicio.cambiarEstadoUsuario(id, body.activo, usuario),
    {
      params,
      body: cambiarEstadoUsuarioSchema,
      detail: { summary: 'Activar o desactivar usuario' },
    },
  )
  .post(
    '/:id/restablecer-contrasena',
    ({ params: { id }, usuario }) => servicio.restablecerContrasena(id, usuario),
    { params, detail: { summary: 'Generar contraseña temporal (RF-03)' } },
  )
