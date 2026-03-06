'use client'
import apiClient from './api'

export interface CreateOrderData {
  gameId: string
  amount: number
  gameName?: string
  itemName?: string
}

export interface OrderResult {
  orderId: string
  amount: number
}

export const paymentService = {
  createOrder: async (data: CreateOrderData): Promise<OrderResult> => {
    const response = await apiClient.post('/payments/order', data)
    return response.data
  },

  confirmPayment: async (paymentKey: string, orderId: string, amount: number) => {
    const response = await apiClient.post('/payments/confirm', { paymentKey, orderId, amount })
    return response.data
  },

  getPaymentHistory: async () => {
    const response = await apiClient.get('/payments/history')
    return response.data
  }
}
