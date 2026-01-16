import { Response } from 'express';
import userService from '@services/userService';
import type { AuthenticatedRequest, ApiResponse } from '@types';

export class UserController {
  async getAllUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await userService.getAllUsers(page, limit);

      res.status(200).json({
        success: true,
        message: 'Users retrieved successfully',
        data: result,
      } as ApiResponse<any>);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({
          success: false,
          message: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Internal server error',
        });
      }
    }
  }

  async getUserById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = await userService.getUserById(id);

      res.status(200).json({
        success: true,
        message: 'User retrieved successfully',
        data: user,
      } as ApiResponse<any>);
    } catch (error) {
      if (error instanceof Error) {
        res.status(error.message === 'User not found' ? 404 : 400).json({
          success: false,
          message: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Internal server error',
        });
      }
    }
  }

  async updateUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { firstName, lastName, role, isActive, departmentId, subDepartmentId } = req.body;

      const user = await userService.updateUser(id, {
        firstName,
        lastName,
        role,
        isActive,
        departmentId,
        subDepartmentId,
      });

      res.status(200).json({
        success: true,
        message: 'User updated successfully',
        data: user,
      } as ApiResponse<any>);
    } catch (error) {
      if (error instanceof Error) {
        res.status(error.message === 'User not found' ? 404 : 400).json({
          success: false,
          message: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Internal server error',
        });
      }
    }
  }

  async deleteUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await userService.deleteUser(id);

      res.status(200).json({
        success: true,
        message: 'User deleted successfully',
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(error.message === 'User not found' ? 404 : 400).json({
          success: false,
          message: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Internal server error',
        });
      }
    }
  }

  async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Not authenticated',
        });
        return;
      }

      const user = await userService.getUserById(req.user.id);

      res.status(200).json({
        success: true,
        message: 'Profile retrieved successfully',
        data: user,
      } as ApiResponse<any>);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({
          success: false,
          message: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Internal server error',
        });
      }
    }
  }

  async createUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { email, password, firstName, lastName, role, departmentId, subDepartmentId } = req.body;

      const user = await userService.createUser({
        email,
        password,
        firstName,
        lastName,
        role,
        departmentId,
        subDepartmentId,
      });

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: user,
      } as ApiResponse<any>);
    } catch (error) {
      if (error instanceof Error) {
        res.status(error.message.includes('already exists') ? 409 : 400).json({
          success: false,
          message: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Internal server error',
        });
      }
    }
  }

  async recalculateSupervisors(_req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const result = await userService.recalculateSupervisorsForAllUsers();

      res.status(200).json({
        success: true,
        message: 'Supervisors recalculated successfully',
        data: result,
      } as ApiResponse<any>);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({
          success: false,
          message: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Internal server error',
        });
      }
    }
  }

  async changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { currentPassword, newPassword } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      if (!currentPassword || !newPassword) {
        res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp đầy đủ thông tin',
        });
        return;
      }

      await userService.changePassword(userId, currentPassword, newPassword);

      res.status(200).json({
        success: true,
        message: 'Đổi mật khẩu thành công',
      } as ApiResponse<void>);
    } catch (error) {
      if (error instanceof Error) {
        const statusCode = error.message.includes('không đúng') ? 401 : 400;
        res.status(statusCode).json({
          success: false,
          message: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Internal server error',
        });
      }
    }
  }

  async updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const {
        firstName,
        lastName,
        email,
        phoneNumber,
        bankAccount,
        lockerNumber,
        weight,
        height,
        shirtSize,
        pantSize,
        shoeSize
      } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      const updatedUser = await userService.updateProfile(userId, {
        firstName,
        lastName,
        email,
        phoneNumber,
        bankAccount,
        lockerNumber,
        weight,
        height,
        shirtSize,
        pantSize,
        shoeSize,
      });

      res.status(200).json({
        success: true,
        message: 'Cập nhật thông tin thành công',
        data: updatedUser,
      } as ApiResponse<any>);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({
          success: false,
          message: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Internal server error',
        });
      }
    }
  }
}

export default new UserController();

