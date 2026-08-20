'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiPatch } from '@/lib/api'
import { extractionKeys } from '@/hooks/use-extraction'
import type { FieldEditRequest, FieldEditResponse, FullExtraction } from '@/types/extraction'

interface UseFieldEditOptions {
  extractionId: string
}

export function useFieldEdit({ extractionId }: UseFieldEditOptions) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: FieldEditRequest) =>
      apiPatch<FieldEditResponse>(`/extractions/${extractionId}/fields`, {
        field_name: request.field_name,
        value: request.value,
      }),
    onMutate: async (request: FieldEditRequest) => {
      const queryKey = extractionKeys.detail(extractionId)
      await queryClient.cancelQueries({ queryKey })

      const previousData = queryClient.getQueryData<FullExtraction>(queryKey)

      if (previousData) {
        const updatedData: FullExtraction = {
          ...previousData,
          extracted_data: {
            ...previousData.extracted_data,
            [request.field_name]: {
              confidence: undefined,
              source_text: undefined,
              ...previousData.extracted_data[request.field_name],
              value: request.value,
            },
          },
        }
        queryClient.setQueryData(queryKey, updatedData)
      }

      return { previousData }
    },
    onError: (_error, variables, context) => {
      if (context?.previousData) {
        const queryKey = extractionKeys.detail(extractionId)
        const currentData = queryClient.getQueryData<FullExtraction>(queryKey)
        if (currentData) {
          // Only revert the specific field, preserve other concurrent edits
          const previousFieldValue = context.previousData.extracted_data[variables.field_name]
          const restoredData = { ...currentData.extracted_data }
          if (previousFieldValue !== undefined) {
            restoredData[variables.field_name] = previousFieldValue
          } else {
            delete restoredData[variables.field_name]
          }
          queryClient.setQueryData(queryKey, {
            ...currentData,
            extracted_data: restoredData,
          })
        } else {
          // Cache was cleared entirely; restore full snapshot as fallback
          queryClient.setQueryData(queryKey, context.previousData)
        }
      }
    },
    onSuccess: (response) => {
      const queryKey = extractionKeys.detail(extractionId)
      const currentData = queryClient.getQueryData<FullExtraction>(queryKey)
      if (currentData) {
        queryClient.setQueryData(queryKey, {
          ...currentData,
          red_flags: response.red_flags,
        })
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: extractionKeys.detail(extractionId),
      })
      queryClient.invalidateQueries({
        queryKey: ['extractions', extractionId, 'edits'],
      })
    },
  })
}
