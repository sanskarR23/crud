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
            return await db.QueryAsync<Employee>(
                "SELECT emp_id AS EmpId, empname AS EmpName, emp_desk_id AS EmpDeskId, password AS Password, image_center AS ImageCenter, image_left AS ImageLeft, image_right AS ImageRight FROM Employees ORDER BY emp_id DESC"
            );
        }

        public async Task<Employee?> GetByIdAsync(string empId)
        {
            using var db = CreateConnection();
            return await db.QueryFirstOrDefaultAsync<Employee>(
                "SELECT emp_id AS EmpId, empname AS EmpName, emp_desk_id AS EmpDeskId, password AS Password, image_center AS ImageCenter, image_left AS ImageLeft, image_right AS ImageRight FROM Employees WHERE emp_id = @EmpId",
                new { EmpId = empId }
            );
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
