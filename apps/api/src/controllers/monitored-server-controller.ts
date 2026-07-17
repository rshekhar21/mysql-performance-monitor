import type { Request, Response } from 'express';
import type {
  MonitoredServerCreateInput,
  MonitoredServerUpdateInput
} from '@mysql-monitor/validation';
import { ValidationError } from '../errors/app-error.js';
import { sendSuccess } from '../middleware/responses.js';
import { auditLogRepository, monitoredServerService } from '../services/index.js';

export class MonitoredServerController {
  async list(_req: Request, res: Response): Promise<void> {
    sendSuccess(res, { servers: await monitoredServerService.list() });
  }

  async get(req: Request, res: Response): Promise<void> {
    sendSuccess(res, { server: await monitoredServerService.get(getServerId(req)) });
  }

  async create(req: Request, res: Response): Promise<void> {
    const body = req.body as MonitoredServerCreateInput;
    const server = await monitoredServerService.create(body);
    await auditLogRepository.create({
      actorUserId: req.user?.id,
      action: 'monitored_server.create',
      entityType: 'monitored_server',
      entityId: server.id,
      requestId: req.requestId,
      ipAddress: req.ip
    });
    sendSuccess(res, { server }, {}, 201);
  }

  async update(req: Request, res: Response): Promise<void> {
    const body = req.body as MonitoredServerUpdateInput;
    const server = await monitoredServerService.update(getServerId(req), body);
    await auditLogRepository.create({
      actorUserId: req.user?.id,
      action: 'monitored_server.update',
      entityType: 'monitored_server',
      entityId: server.id,
      requestId: req.requestId,
      ipAddress: req.ip
    });
    sendSuccess(res, { server });
  }

  async delete(req: Request, res: Response): Promise<void> {
    const serverId = getServerId(req);
    await monitoredServerService.delete(serverId);
    await auditLogRepository.create({
      actorUserId: req.user?.id,
      action: 'monitored_server.delete',
      entityType: 'monitored_server',
      entityId: serverId,
      requestId: req.requestId,
      ipAddress: req.ip
    });
    sendSuccess(res, { ok: true });
  }

  async testConnection(req: Request, res: Response): Promise<void> {
    const body = req.body as MonitoredServerCreateInput;
    sendSuccess(res, await monitoredServerService.testConnection(body));
  }

  async testStoredConnection(req: Request, res: Response): Promise<void> {
    sendSuccess(res, await monitoredServerService.testStoredConnection(getServerId(req)));
  }
}

function getServerId(req: Request): string {
  const serverId = req.params.serverId;

  if (typeof serverId !== 'string') {
    throw new ValidationError([{ path: ['serverId'], message: 'serverId is required' }]);
  }

  return serverId;
}
