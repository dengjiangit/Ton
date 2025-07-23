export enum RedPacketState {
  Active = 'active',
  Expired = 'expired',
  Completed = 'completed',
}

export interface RedPacket {
  id: string
  creator: string
  totalAmount: number
  remainingAmount: number
  totalCount: number
  claimedCount: number
  message?: string
  createdAt: Date
  expiresAt: Date
  state: RedPacketState
  claimers: string[]
  token?: string
  shareLink?: string
  qrCode?: string
}

export interface AirdropData {
  addresses: string[]
  amounts: number[]
  totalAmount: number
  token: string
}

export enum AirdropType {
  RED_PACKET = 'Red Packet',
  WHITELIST = 'Whitelist'
}

export interface CreateAirdropStep {
  step: number
  title: string
  completed: boolean
} 