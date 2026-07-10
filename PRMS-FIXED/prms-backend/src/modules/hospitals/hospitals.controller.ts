/**
 * Hospitals Controller
 *
 * Architecture Contract §4.1 — controllers handle HTTP I/O only.
 * No business logic here — delegate to HospitalService.
 */

import type { Request, Response, NextFunction } from 'express';
import { HospitalService } from './hospitals.service.js';
import { sendSuccess, sendCreated, sendNoContent } from '../../shared/response.helper.js';
import { parsePagination } from '../../shared/pagination.helper.js';
import type {
  TCreateHospitalInput,
  TUpdateHospitalInput,
  TListHospitalsQuery,
  TUpdateHospitalStatusInput,
} from './hospitals.validator.js';

export class HospitalController {
  constructor(private readonly service: HospitalService) {}

  // POST /hospitals
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = req.body as TCreateHospitalInput;
      const hospital = await this.service.createHospital({
        mohCode: body.mohCode,
        name: body.name,
        facilityLevel: body.facilityLevel,
        county: body.county,
        subCounty: body.subCounty,
        address: body.address,
        phone: body.phone,
        email: body.email,
      });
      sendCreated(res, hospital, 'Hospital registered successfully');
    } catch (err) {
      next(err);
    }
  };

  // GET /hospitals
  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.query as unknown as TListHospitalsQuery;
      const pagination = parsePagination(req);
      const result = await this.service.listHospitals(
        pagination,
        {
          status: query.status,
          county: query.county,
          facilityLevel: query.facilityLevel,
          q: query.q,
        },
        req.user!.role,
      );
      sendSuccess(res, result.hospitals, 'Hospitals retrieved', 200, result.pagination);
    } catch (err) {
      next(err);
    }
  };

  // GET /hospitals/:id
  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = parseInt(req.params.hospitalId!, 10);
      const hospital = await this.service.getHospitalById(id);
      sendSuccess(res, hospital, 'Hospital retrieved');
    } catch (err) {
      next(err);
    }
  };

  // PATCH /hospitals/:id
  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = parseInt(req.params.hospitalId!, 10);
      const body = req.body as TUpdateHospitalInput;
      const hospital = await this.service.updateHospital(
        id, body, req.user!.role, req.user!.hospitalId,
      );
      sendSuccess(res, hospital, 'Hospital updated');
    } catch (err) {
      next(err);
    }
  };

  // DELETE /hospitals/:id
  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = parseInt(req.params.hospitalId!, 10);
      await this.service.deleteHospital(id, req.user!.userId);
      sendNoContent(res);
    } catch (err) {
      next(err);
    }
  };

  // PATCH /hospitals/:hospitalId/status — OpenAPI v1.0 / web UpdateHospitalStatusRequest
  updateStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id   = parseInt(req.params.hospitalId!, 10);
      const body = req.body as TUpdateHospitalStatusInput;
      let hospital;
      if (body.status === 'Approved') {
        hospital = await this.service.approveHospital(id, req.user!.userId, body.reason);
      } else if (body.status === 'Suspended') {
        hospital = await this.service.suspendHospital(id, req.user!.userId, body.reason);
      } else {
        hospital = await this.service.reactivateHospital(id, req.user!.userId);
      }
      sendSuccess(res, hospital, `Hospital status updated to ${body.status}`);
    } catch (err) { next(err); }
  };

  // POST /hospitals/:id/approve
  approve = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = parseInt(req.params.hospitalId!, 10);
      const { reason } = req.body as { reason?: string };
      const hospital = await this.service.approveHospital(id, req.user!.userId, reason);
      sendSuccess(res, hospital, 'Hospital approved');
    } catch (err) {
      next(err);
    }
  };

  // POST /hospitals/:id/suspend
  suspend = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = parseInt(req.params.hospitalId!, 10);
      const { reason } = req.body as { reason: string };
      const hospital = await this.service.suspendHospital(id, req.user!.userId, reason);
      sendSuccess(res, hospital, 'Hospital suspended');
    } catch (err) {
      next(err);
    }
  };

  // POST /hospitals/:id/reactivate
  reactivate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = parseInt(req.params.hospitalId!, 10);
      const { reason } = req.body as { reason?: string };
      const hospital = await this.service.reactivateHospital(id, req.user!.userId, reason);
      sendSuccess(res, hospital, 'Hospital reactivated');
    } catch (err) {
      next(err);
    }
  };

  // GET /hospitals/:id/approval-history
  approvalHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = parseInt(req.params.hospitalId!, 10);
      const pagination = parsePagination(req);
      const result = await this.service.getApprovalHistory(id, pagination);
      sendSuccess(res, result.history, 'Approval history retrieved', 200, result.pagination);
    } catch (err) {
      next(err);
    }
  };
}
