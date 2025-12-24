/**
 * Domain types for Enterprise Support Agent
 */

export interface SupportRequest {
  customerId: string;
  message: string;
  conversationHistory?: ConversationMessage[];
  metadata?: CustomerMetadata;
  attachments?: Attachment[];
}

export interface ConversationMessage {
  role: 'customer' | 'agent' | 'system';
  content: string;
  timestamp: Date;
}

export interface CustomerMetadata {
  orderId?: string;
  accountAge?: number; // in days
  previousTickets?: number;
  customerTier?: 'free' | 'premium' | 'enterprise';
  preferredLanguage?: string;
}

export interface Attachment {
  name: string;
  type: string;
  size: number;
  url?: string;
}

export interface SupportResponse {
  message: string;
  sentiment: SentimentAnalysis;
  category: SupportCategory;
  priority: Priority;
  requiresEscalation: boolean;
  suggestedActions: string[];
  confidence: number;
  language: string;
  metadata: ResponseMetadata;
  timestamp: Date;
}

export interface SentimentAnalysis {
  score: number; // -1 to 1
  label: 'positive' | 'neutral' | 'negative';
}

export type SupportCategory =
  | 'billing'
  | 'technical'
  | 'shipping'
  | 'product'
  | 'account'
  | 'general';

export type Priority = 'low' | 'medium' | 'high' | 'critical';

export interface ResponseMetadata {
  ticketId?: string;
  orderId?: string;
  knowledgeArticles?: string[];
  toolsUsed?: string[];
  escalationReason?: string;
}

/**
 * Support Ticket Value Object
 */
export interface SupportTicket {
  id: string;
  customerId: string;
  subject: string;
  description: string;
  category: SupportCategory;
  priority: Priority;
  status: TicketStatus;
  assignedTo?: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  tags: string[];
}

export type TicketStatus =
  | 'open'
  | 'in_progress'
  | 'waiting_customer'
  | 'waiting_internal'
  | 'resolved'
  | 'closed';

/**
 * Knowledge Article Value Object
 */
export interface KnowledgeArticle {
  id: string;
  title: string;
  content: string;
  category: SupportCategory;
  tags: string[];
  relevanceScore?: number;
  lastUpdated: Date;
  viewCount: number;
}

/**
 * Order Information
 */
export interface OrderInfo {
  orderId: string;
  customerId: string;
  status: OrderStatus;
  items: OrderItem[];
  total: number;
  currency: string;
  createdAt: Date;
  estimatedDelivery?: Date;
  trackingNumber?: string;
}

export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}
