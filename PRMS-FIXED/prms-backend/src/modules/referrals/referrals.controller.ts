/**
 * Referrals Controller — HTTP I/O only.
 * Delegates all business logic to ReferralService.
 */

import type { Request, Response, NextFunction } from 'express';
import { ReferralService } from './referrals.service.js';
import { sendSuccess, sendCreated, sendNoContent } from '../../shared/response.helper.js';
import { parsePagination } from '../../shared/pagination.helper.js';
import type {
  TCreateReferralInput,
  TUpdateReferralInput,
  TTransitionStatusInput,
  TListReferralsQuery,
} from './referrals.validator.js';
import type { TUserRole } from '../../config/jwt.config.js';

export class ReferralController {
  constructor(private readonly service: ReferralService) {}

  // POST /referrals
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body     = req.body as TCreateReferralInput;
      const referral = await this.service.createReferral(
        body,
        req.user!.userId,
        req.user!.hospitalId!,
        req.user!.role as TUserRole,
      );
      sendCreated(res, referral, 'Referral created successfully');
    } catch (err) { next(err); }
  };

  // GET /referrals
  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query      = req.query as unknown as TListReferralsQuery;
      const pagination = parsePagination(req);
      const result     = await this.service.listReferrals(
        pagination,
        {
          status:       query.status,
          urgencyLevel: query.urgencyLevel,
          patientId:    query.patientId,
          hospitalRole: query.hospitalRole,
        },
        req.user!.role as TUserRole,
        req.user!.hospitalId,
      );
      sendSuccess(res, result.referrals, 'Referrals retrieved', 200, result.pagination);
    } catch (err) { next(err); }
  };

  // GET /referrals/code/:code
  getByCode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const referral = await this.service.getReferralByCode(
        req.params.code!,
        req.user!.role as TUserRole,
        req.user!.hospitalId,
      );
      sendSuccess(res, referral, 'Referral retrieved');
    } catch (err) { next(err); }
  };

  // GET /referrals/:referralId
  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id       = parseInt(req.params.referralId!, 10);
      const referral = await this.service.getReferralById(
        id,
        req.user!.role as TUserRole,
        req.user!.hospitalId,
      );
      sendSuccess(res, referral, 'Referral retrieved');
    } catch (err) { next(err); }
  };

  // PATCH /referrals/:referralId
  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id       = parseInt(req.params.referralId!, 10);
      const body     = req.body as TUpdateReferralInput;
      const referral = await this.service.updateReferral(
        id, body,
        req.user!.role as TUserRole,
        req.user!.userId,
        req.user!.hospitalId,
      );
      sendSuccess(res, referral, 'Referral updated');
    } catch (err) { next(err); }
  };

  // DELETE /referrals/:referralId
  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = parseInt(req.params.referralId!, 10);
      await this.service.deleteReferral(
        id,
        req.user!.role as TUserRole,
        req.user!.userId,
        req.user!.hospitalId,
      );
      sendNoContent(res);
    } catch (err) { next(err); }
  };

  // PATCH /referrals/:referralId/status  — Module 5
  transition = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id   = parseInt(req.params.referralId!, 10);
      const body = req.body as TTransitionStatusInput;
      const referral = await this.service.transitionStatus(
        id,
        {
          newStatus:       body.status,
          rejectionReason: body.rejectionReason,
          notes:           body.notes,
          ipAddress:       req.ip,
        },
        req.user!.role as TUserRole,
        req.user!.userId,
        req.user!.hospitalId,
      );
      sendSuccess(res, referral, `Referral transitioned to '${body.status}'`);
    } catch (err) { next(err); }
  };

  // GET /referrals/:referralId/timeline  — Module 6
  timeline = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id      = parseInt(req.params.referralId!, 10);
      const entries = await this.service.getReferralTimeline(
        id,
        req.user!.role as TUserRole,
        req.user!.hospitalId,
      );
      sendSuccess(res, entries, 'Referral timeline retrieved');
    } catch (err) { next(err); }
  };

  // GET /referrals/:referralId/attachments
  getAttachments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id          = parseInt(req.params.referralId!, 10);
      const attachments = await this.service.getAttachments(
        id,
        req.user!.role as TUserRole,
        req.user!.hospitalId,
      );
      sendSuccess(res, attachments, 'Attachments retrieved');
    } catch (err) { next(err); }
  };

  // DELETE /referrals/:referralId/attachments/:attachmentId
  removeAttachment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id           = parseInt(req.params.referralId!, 10);
      const attachmentId = parseInt(req.params.attachmentId!, 10);
      await this.service.removeAttachment(
        id, attachmentId,
        req.user!.role as TUserRole,
        req.user!.userId,
        req.user!.hospitalId,
      );
      sendNoContent(res);
    } catch (err) { next(err); }
  };
}
