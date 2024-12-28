import { AdminOrStaffGuard } from './admin-or-staff.guard';

describe('AdminOrStaffGuard', () => {
  it('should be defined', () => {
    expect(new AdminOrStaffGuard()).toBeDefined();
  });
});
