import type { ReactNode } from 'react'
import type { Control, FieldPath, FieldValues } from 'react-hook-form'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface CampoProps<T extends FieldValues, TOut extends FieldValues = T> {
  control: Control<T, unknown, TOut>
  name: FieldPath<T>
  etiqueta: string
  descripcion?: string
  placeholder?: string
  tipo?: 'text' | 'number' | 'email' | 'tel'
  paso?: string
}

/** Campo de texto/número integrado con react-hook-form y shadcn Form. */
export function CampoTexto<T extends FieldValues>({
  control,
  name,
  etiqueta,
  descripcion,
  placeholder,
  tipo = 'text',
  paso,
}: CampoProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{etiqueta}</FormLabel>
          <FormControl>
            <Input
              type={tipo}
              step={paso}
              inputMode={tipo === 'number' ? 'decimal' : undefined}
              placeholder={placeholder}
              autoComplete="off"
              {...field}
              value={field.value ?? ''}
            />
          </FormControl>
          {descripcion && <FormDescription>{descripcion}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

interface CampoSelectProps<T extends FieldValues, TOut extends FieldValues = T> {
  control: Control<T, unknown, TOut>
  name: FieldPath<T>
  etiqueta: string
  placeholder?: string
  descripcion?: string
  opciones: { valor: string; etiqueta: ReactNode }[]
  /** Valor de la opción que representa "ninguno": se guarda como null en el formulario. */
  valorNulo?: string
}

export function CampoSelect<T extends FieldValues>({
  control,
  name,
  etiqueta,
  placeholder,
  descripcion,
  opciones,
}: CampoSelectProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{etiqueta}</FormLabel>
          <Select
            onValueChange={field.onChange}
            value={field.value === undefined || field.value === null ? '' : String(field.value)}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={placeholder ?? 'Seleccione'} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {opciones.map((o) => (
                <SelectItem key={o.valor} value={o.valor}>
                  {o.etiqueta}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {descripcion && <FormDescription>{descripcion}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
