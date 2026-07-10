/**
 * Users Controller — HTTP I/O only, delegates to UserService.
 */

import type { Request, Response, NextFunction } from 'express';
import { UserService } from './users.service.js';
import { sendSuccess, sendCreated, sendNoContent } from '../../shared/response.helper.js';
import { parsePagination } from '../../shared/pagination.helper.js';
import type { TCreateUserInput, TUpdateUserInput, TChangePasswordInput, TListUsersQuery, TUpdateUserStatusInput } from './users.validator.js';
import type { TUserRole } from '../../config/jwt.config.js';

export class UserController {
  constructor(private readonly service: UserService) {}

  // POST /users
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = req.body as TCreateUserInput;
      const user = await this.service.createUser(
        body,
        req.user!.role as TUserRole,
        req.user!.hospitalId,
      );
      sendCreated(res, user, 'User created successfully');
    } catch (err) {
      next(err);
    }
  };

  // GET /users
  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query  = req.query as unknown as TListUsersQuery;
      const pagination = parsePagination(req);
      const result = await this.service.listUsers(
        pagination,
        { hospitalId: query.hospitalId, role: query.role, status: query.status },
        req.user!.role as TUserRole,
        req.user!.hospitalId,
      );
      sendSuccess(res, result.users, 'Users retrieved', 200, result.pagination);
    } catch (err) {
      next(err);
    }
  };

  // GET /users/:id
  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id   = parseInt(req.params.userId!, 10);
      const user = await this.service.getUserById(id, req.user!.role as TUserRole, req.user!.hospitalId);
      sendSuccess(res, user, 'User retrieved');
    } catch (err) {
      next(err);
    }
  };

  // PATCH /users/:id
  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id   = parseInt(req.params.userId!, 10);
      const body = req.body as TUpdateUserInput;
      const user = await this.service.updateUser(
        id, body,
        req.user!.role as TUserRole,
        req.user!.userId,
        req.user!.hospitalId,
      );
      sendSuccess(res, user, 'User updated');
    } catch (err) {
      next(err);
    }
  };

  // PATCH /users/:id/password
  changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id   = parseInt(req.params.userId!, 10);
      const body = req.body as TChangePasswordInput;
      await this.service.changePassword(id, body.currentPassword, body.newPassword, req.user!.userId);
      sendSuccess(res, null, 'Password changed successfully');
    } catch (err) {
      next(err);
    }
  };

  // PATCH /users/:userId/status
  updateStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id   = parseInt(req.params.userId!, 10);
      const body = req.body as TUpdateUserStatusInput;
      let user;
      if (body.status === 'Suspended') {
        user = await this.service.suspendUser(id, req.user!.role as TUserRole, req.user!.hospitalId);
      } else {
        user = await this.service.reactivateUser(id, req.user!.role as TUserRole);
      }
      sendSuccess(res, user, `User status updated to ${body.status}`);
    } catch (err) { next(err); }
  };

  // POST /users/:id/suspend
  suspend = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id   = parseInt(req.params.userId!, 10);
      const user = await this.service.suspendUser(id, req.user!.role as TUserRole, req.user!.hospitalId);
      sendSuccess(res, user, 'User suspended');
    } catch (err) {
      next(err);
    }
  };

  // POST /users/:id/reactivate
  reactivate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id   = parseInt(req.params.userId!, 10);
      const user = await this.service.reactivateUser(id, req.user!.role as TUserRole);
      sendSuccess(res, user, 'User reactivated');
    } catch (err) {
      next(err);
    }
  };

  // DELETE /users/:id
  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = parseInt(req.params.userId!, 10);
      await this.service.deleteUser(id, req.user!.role as TUserRole, req.user!.userId);
      sendNoContent(res);
    } catch (err) {
      next(err);
    }
  };
}
