import { Router, Request, Response } from 'express';
import { GitHubAppController } from '../controllers/github-app-controller';
import { GitHubOAuthController } from '../controllers/github-oauth-controller';
import { authMiddleware } from '../middleware/auth-middleware';

const router = Router();
const githubAppController = new GitHubAppController();
const githubOAuthController = new GitHubOAuthController();

// GitHub App installation routes
router.get('/install', authMiddleware, async (req: Request, res: Response) => {
  await githubAppController.initiateInstallation(req, res);
});

// OAuth code exchange (when user returns from GitHub with authorization code)
router.post('/oauth/exchange', authMiddleware, async (req: Request, res: Response) => {
  await githubOAuthController.exchangeCode(req, res);
});

// Installation callback (for non-OAuth flows, rarely used)
router.get('/callback', authMiddleware, async (req: Request, res: Response) => {
  await githubAppController.handleInstallationCallback(req as any, res);
});

// User installations and repositories
router.get('/installations', authMiddleware, async (req: Request, res: Response) => {
  await githubAppController.getUserInstallations(req as any, res);
});

router.get('/repositories', authMiddleware, async (req: Request, res: Response) => {
  await githubAppController.getUserRepositories(req as any, res);
});

router.get('/installations/:installationId/repositories', authMiddleware, async (req: Request, res: Response) => {
  await githubAppController.getInstallationRepositories(req as any, res);
});

// Repository access management
router.post('/repositories/access', authMiddleware, async (req: Request, res: Response) => {
  await githubAppController.grantRepositoryAccess(req as any, res);
});

router.delete('/repositories/:repositoryId/access', authMiddleware, async (req: Request, res: Response) => {
  await githubAppController.revokeRepositoryAccess(req as any, res);
});

// Webhook endpoint (no auth required - verified by signature)
router.post('/webhook', async (req: Request, res: Response) => {
  await githubAppController.handleWebhook(req, res);
});

export default router;