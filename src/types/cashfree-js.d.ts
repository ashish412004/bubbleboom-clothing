declare module '@cashfreepayments/cashfree-js' {
  export interface CashfreeInstance {
    checkout(options: {
      paymentSessionId: string
      redirectTarget?: '_self' | '_modal' | '_blank' | '_top' | HTMLElement
      appearance?: {
        width?: string
        height?: string
        style?: Record<string, string>
      }
    }): Promise<{
      error?: {
        message?: string
        code?: string
      }
      redirect?: boolean
      paymentDetails?: any
    }>
  }

  export function load(options: {
    mode: 'sandbox' | 'production'
  }): Promise<CashfreeInstance | null>
}
