// Cloudflare Pages Function: serves the same /api/live handler as the Vercel function
import { GET } from '../../api/live';

export const onRequestGet = ({ request }: { request: Request }) => GET(request);
