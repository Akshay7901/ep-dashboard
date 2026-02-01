/**
 * Mock API Service for Testing
 * 
 * This simulates API responses for development/testing.
 * Replace with real API calls when ready for production.
 * 
 * Test credentials:
 * Email: demo@example.com
 * Password: password123
 */

import { User, AuthResponse, Proposal, PaginatedResponse } from '@/types';

// Simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock user data
const mockUser: User = {
  id: 'user-1',
  email: 'demo@example.com',
  name: 'John Doe',
  avatar: undefined,
};

// Mock proposals data
export const mockProposals: Proposal[] = [
  {
    id: '1',
    name: 'Website Redesign Proposal',
    client: 'Acme Corporation',
    clientEmail: 'contact@acmecorp.com',
    clientPhone: '+1 (555) 123-4567',
    status: 'approved',
    description: `Complete redesign of corporate website with modern UI/UX principles and responsive design.

This proposal outlines a comprehensive website redesign project that will transform your current online presence into a modern, user-centric digital experience. Our approach focuses on:

• User Research & Analysis: Understanding your target audience and their needs
• Information Architecture: Restructuring content for optimal navigation
• Visual Design: Creating a fresh, modern aesthetic aligned with your brand
• Responsive Development: Ensuring seamless experience across all devices
• Performance Optimization: Fast loading times and efficient code
• SEO Implementation: Built-in search engine optimization best practices

The project timeline is estimated at 12 weeks from kickoff to launch, with regular milestone reviews and client feedback sessions.`,
    createdAt: '2025-01-15T10:00:00Z',
    updatedAt: '2025-01-28T14:30:00Z',
    attachments: [
      { id: 'a1', name: 'Project_Scope.pdf', url: '#', type: 'pdf', size: 2500000 },
      { id: 'a2', name: 'Design_Mockups.zip', url: '#', type: 'zip', size: 15000000 },
    ],
    value: 45000,
  },
  {
    id: '2',
    name: 'Mobile App Development',
    client: 'TechStart Inc',
    clientEmail: 'hello@techstart.io',
    clientPhone: '+1 (555) 987-6543',
    status: 'pending',
    description: 'Development of iOS and Android mobile applications for customer engagement platform. Includes user authentication, push notifications, offline mode, and analytics integration.',
    createdAt: '2025-01-20T14:30:00Z',
    value: 78000,
  },
  {
    id: '3',
    name: 'E-commerce Platform',
    client: 'RetailPlus',
    clientEmail: 'projects@retailplus.com',
    status: 'draft',
    description: 'Full-scale e-commerce solution with inventory management, payment integration (Stripe, PayPal), shipping calculations, and admin dashboard.',
    createdAt: '2025-01-22T09:15:00Z',
    value: 95000,
  },
  {
    id: '4',
    name: 'Cloud Migration Services',
    client: 'DataFlow Systems',
    clientEmail: 'tech@dataflow.com',
    status: 'rejected',
    description: 'Migration of legacy infrastructure to AWS cloud with improved scalability, cost optimization, and disaster recovery planning.',
    createdAt: '2025-01-10T16:45:00Z',
    value: 65000,
  },
  {
    id: '5',
    name: 'CRM Integration Project',
    client: 'Sales Force Pro',
    clientEmail: 'info@salesforcepro.com',
    clientPhone: '+1 (555) 456-7890',
    status: 'approved',
    description: 'Integration of Salesforce CRM with existing business processes and workflows. Includes data migration, custom fields setup, and team training.',
    createdAt: '2025-01-18T11:20:00Z',
    value: 32000,
  },
  {
    id: '6',
    name: 'Security Audit & Compliance',
    client: 'FinanceSecure Ltd',
    clientEmail: 'security@financesecure.com',
    status: 'pending',
    description: 'Comprehensive security audit and implementation of compliance measures for SOC 2 and GDPR requirements.',
    createdAt: '2025-01-25T08:00:00Z',
    value: 28000,
  },
  {
    id: '7',
    name: 'Data Analytics Dashboard',
    client: 'Metrics Pro',
    clientEmail: 'analytics@metricspro.com',
    status: 'approved',
    description: 'Custom analytics dashboard with real-time data visualization, KPI tracking, and automated reporting.',
    createdAt: '2025-01-12T13:00:00Z',
    value: 42000,
  },
  {
    id: '8',
    name: 'API Gateway Implementation',
    client: 'DevOps United',
    clientEmail: 'team@devopsunited.io',
    status: 'pending',
    description: 'Design and implementation of API gateway with rate limiting, authentication, and monitoring capabilities.',
    createdAt: '2025-01-28T09:30:00Z',
    value: 55000,
  },
];

// Mock API functions
export const mockApi = {
  // Authentication
  async login(email: string, password: string): Promise<AuthResponse> {
    await delay(800); // Simulate network latency
    
    // Check credentials
    if (email === 'demo@example.com' && password === 'password123') {
      return {
        user: mockUser,
        token: 'mock-jwt-token-' + Date.now(),
      };
    }
    
    throw { message: 'Invalid email or password', status: 401 };
  },

  async forgotPassword(email: string): Promise<{ message: string }> {
    await delay(1000);
    
    // Simulate email validation
    if (!email.includes('@')) {
      throw { message: 'Invalid email address', status: 400 };
    }
    
    return { message: 'Password reset instructions sent to your email' };
  },

  // Proposals
  async getProposals(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<PaginatedResponse<Proposal>> {
    await delay(600);
    
    const { page = 1, limit = 6, search = '' } = params || {};
    
    // Filter by search
    let filtered = mockProposals;
    if (search) {
      const query = search.toLowerCase();
      filtered = mockProposals.filter(
        p =>
          p.name.toLowerCase().includes(query) ||
          p.client.toLowerCase().includes(query) ||
          p.status.toLowerCase().includes(query)
      );
    }
    
    // Paginate
    const total = filtered.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const data = filtered.slice(start, start + limit);
    
    return {
      data,
      total,
      page,
      limit,
      totalPages,
    };
  },

  async getProposalById(id: string): Promise<Proposal> {
    await delay(500);
    
    const proposal = mockProposals.find(p => p.id === id);
    
    if (!proposal) {
      throw { message: 'Proposal not found', status: 404 };
    }
    
    return proposal;
  },

  // Dashboard stats
  async getDashboardStats(): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  }> {
    await delay(400);
    
    return {
      total: mockProposals.length,
      pending: mockProposals.filter(p => p.status === 'pending').length,
      approved: mockProposals.filter(p => p.status === 'approved').length,
      rejected: mockProposals.filter(p => p.status === 'rejected').length,
    };
  },
};
