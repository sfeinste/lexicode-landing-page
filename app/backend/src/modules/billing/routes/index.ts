import { Router } from 'express';
import { BillingController } from '../controllers/billing-controller';
import { authMiddleware } from '@/modules/auth/middleware/auth-middleware';

const router = Router();
const billingController = new BillingController();

// All billing routes require authentication
router.use(authMiddleware);

// Subscription management routes
router.get('/subscriptions', billingController.getSubscriptions.bind(billingController));
router.post('/subscriptions', billingController.createSubscription.bind(billingController));
router.put('/subscriptions/:id', billingController.updateSubscription.bind(billingController));
router.delete('/subscriptions/:id', billingController.cancelSubscription.bind(billingController));

// Usage and billing routes
router.get('/usage', billingController.getUsage.bind(billingController));
router.get('/invoices', billingController.getInvoices.bind(billingController));
router.get('/invoices/:id', billingController.getInvoice.bind(billingController));

// Payment methods
router.get('/payment-methods', billingController.getPaymentMethods.bind(billingController));
router.post('/payment-methods', billingController.addPaymentMethod.bind(billingController));
router.delete('/payment-methods/:id', billingController.removePaymentMethod.bind(billingController));

// Stripe webhooks (public endpoint)
router.post('/webhooks/stripe', billingController.handleStripeWebhook.bind(billingController));

export { router as billingRoutes };