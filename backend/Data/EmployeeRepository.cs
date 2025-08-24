using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;
using Dapper;
using Backend.Models;
using MySqlConnector;

namespace Backend.Data
{
    public class EmployeeRepository
    {
        private readonly string _connectionString;
        public EmployeeRepository(string connectionString)
        {
            _connectionString = connectionString;
        }

        private IDbConnection CreateConnection() => new MySqlConnection(_connectionString);

        public async Task<IEnumerable<Employee>> GetAllAsync()
        {
            using var db = CreateConnection();
            var rows = await db.QueryAsync("SELECT emp_id, empname, emp_desk_id, password, image_center, image_left, image_right FROM Employees ORDER BY emp_id DESC");
            var list = new List<Employee>();
            foreach (var r in rows)
            {
                object? center = r.image_center;
                object? left = r.image_left;
                object? right = r.image_right;

                list.Add(new Employee
                {
                    EmpId = r.emp_id?.ToString() ?? string.Empty,
                    EmpName = r.empname?.ToString() ?? string.Empty,
                    EmpDeskId = r.emp_desk_id?.ToString() ?? string.Empty,
                    Password = r.password?.ToString() ?? string.Empty,
                    ImageCenter = center is byte[] cb ? Convert.ToBase64String(cb) : center?.ToString(),
                    ImageLeft = left is byte[] lb ? Convert.ToBase64String(lb) : left?.ToString(),
                    ImageRight = right is byte[] rb ? Convert.ToBase64String(rb) : right?.ToString(),
                });
            }
            return list;
        }

        public async Task<Employee?> GetByIdAsync(string empId)
        {
            using var db = CreateConnection();
            var row = await db.QueryFirstOrDefaultAsync("SELECT emp_id, empname, emp_desk_id, password, image_center, image_left, image_right FROM Employees WHERE emp_id = @EmpId", new { EmpId = empId });
            if (row == null) return null;

            object? center = row.image_center;
            object? left = row.image_left;
            object? right = row.image_right;

            return new Employee
            {
                EmpId = row.emp_id?.ToString() ?? string.Empty,
                EmpName = row.empname?.ToString() ?? string.Empty,
                EmpDeskId = row.emp_desk_id?.ToString() ?? string.Empty,
                Password = row.password?.ToString() ?? string.Empty,
                ImageCenter = center is byte[] cb ? Convert.ToBase64String(cb) : center?.ToString(),
                ImageLeft = left is byte[] lb ? Convert.ToBase64String(lb) : left?.ToString(),
                ImageRight = right is byte[] rb ? Convert.ToBase64String(rb) : right?.ToString(),
            };
        }

        public async Task<int> CreateAsync(Employee employee)
        {
            using var db = CreateConnection();
            var sql = @"INSERT INTO Employees (emp_id, empname, emp_desk_id, password, image_center, image_left, image_right) 
                        VALUES (@EmpId, @EmpName, @EmpDeskId, @Password, @ImageCenter, @ImageLeft, @ImageRight)";
            return await db.ExecuteAsync(sql, employee);
        }

        public async Task<bool> UpdateAsync(Employee employee)
        {
            using var db = CreateConnection();
            var sql = @"UPDATE Employees 
                        SET empname = @EmpName, emp_desk_id = @EmpDeskId, password = @Password, 
                            image_center = @ImageCenter, image_left = @ImageLeft, image_right = @ImageRight 
                        WHERE emp_id = @EmpId";
            var affected = await db.ExecuteAsync(sql, employee);
            return affected > 0;
        }

        public async Task<bool> DeleteAsync(string empId)
        {
            using var db = CreateConnection();
            var affected = await db.ExecuteAsync("DELETE FROM Employees WHERE emp_id = @EmpId", new { EmpId = empId });
            return affected > 0;
        }
    }
}
