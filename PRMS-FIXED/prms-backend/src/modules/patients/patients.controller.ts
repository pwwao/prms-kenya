/**
 * Patients Controller
 */

import type { Request, Response, NextFunction } from 'express';
import { PatientService } from './patients.service.js';
import { sendSuccess, sendCreated } from '../../shared/response.helper.js';
import { parsePagination } from '../../shared/pagination.helper.js';
import type { TCreatePatientInput, TUpdatePatientInput, TListPatientsQuery } from './patients.validator.js';
import type { TUserRole } from '../../config/jwt.config.js';

export class PatientController {
  constructor(private readonly service: PatientService) {}

  // POST /patients
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body    = req.body as TCreatePatientInput;
      const patient = await this.service.createPatient(
        body,
        req.user!.userId,
        req.user!.hospitalId!,
      );
      sendCreated(res, patient, 'Patient registered successfully');
    } catch (err) { next(err); }
  };

  // GET /patients
  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query      = req.query as unknown as TListPatientsQuery;
      const pagination = parsePagination(req);
      const result     = await this.service.listPatients(
        pagination,
        { county: query.county, gender: query.gender, q: query.q },
        req.user!.role as TUserRole,
        req.user!.hospitalId,
      );
      sendSuccess(res, result.patients, 'Patients retrieved', 200, result.pagination);
    } catch (err) { next(err); }
  };

  // GET /patients/search
  search = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { nationalId, phone, q } = req.query as { nationalId?: string; phone?: string; q?: string };
      if (nationalId) {
        const patient = await this.service.searchByNationalId(
          nationalId, req.user!.role as TUserRole, req.user!.hospitalId,
        );
        sendSuccess(res, patient, patient ? 'Patient found' : 'No patient found');
      } else if (phone) {
        const patients = await this.service.searchByPhone(
          phone, req.user!.role as TUserRole, req.user!.hospitalId,
        );
        sendSuccess(res, patients, 'Search results');
      } else if (q) {
        const patients = await this.service.searchByQuery(
          q, req.user!.role as TUserRole, req.user!.hospitalId,
        );
        sendSuccess(res, patients, 'Search results');
      } else {
        sendSuccess(res, [], 'Search results');
      }
    } catch (err) { next(err); }
  };

  // GET /patients/:id
  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id      = parseInt(req.params.patientId!, 10);
      const patient = await this.service.getPatientById(id, req.user!.role as TUserRole, req.user!.hospitalId);
      sendSuccess(res, patient, 'Patient retrieved');
    } catch (err) { next(err); }
  };

  // PATCH /patients/:id
  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id      = parseInt(req.params.patientId!, 10);
      const body    = req.body as TUpdatePatientInput;
      const patient = await this.service.updatePatient(id, body, req.user!.role as TUserRole, req.user!.hospitalId);
      sendSuccess(res, patient, 'Patient updated');
    } catch (err) { next(err); }
  };

  // GET /patients/:id/referral-history
  referralHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id      = parseInt(req.params.patientId!, 10);
      const history = await this.service.getPatientReferralHistory(id, req.user!.role as TUserRole, req.user!.hospitalId);
      sendSuccess(res, history, 'Referral history retrieved');
    } catch (err) { next(err); }
  };
}
