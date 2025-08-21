_using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;
using Dapper;
using Backend.Models;
using MySqlConnector;

namespace Backend.Data
{
    public class TodoRepository
    {
        private readonly string _connectionString;
        public TodoRepository(string connectionString)
        {
            _connectionString = connectionString;
        }

        private IDbConnection CreateConnection() => new MySqlConnection(_connectionString);

        public async Task<IEnumerable<Todo>> GetAllAsync()
        {
            using var db = CreateConnection();
            return await db.QueryAsync<Todo>("SELECT Id, Title, Description, Completed FROM Todos ORDER BY Id DESC");
        }

        public async Task<Todo?> GetByIdAsync(int id)
        {
            using var db = CreateConnection();
            return await db.QueryFirstOrDefaultAsync<Todo>("SELECT Id, Title, Description, Completed FROM Todos WHERE Id = @Id", new { Id = id });
        }

        public async Task<int> CreateAsync(Todo todo)
        {
            using var db = CreateConnection();
            var sql = "INSERT INTO Todos (Title, Description, Completed) VALUES (@Title, @Description, @Completed); SELECT LAST_INSERT_ID();";
            var id = await db.ExecuteScalarAsync<int>(sql, todo);
            return id;
        }

        public async Task<bool> UpdateAsync(Todo todo)
        {
            using var db = CreateConnection();
            var sql = "UPDATE Todos SET Title = @Title, Description = @Description, Completed = @Completed WHERE Id = @Id";
            var affected = await db.ExecuteAsync(sql, todo);
            return affected > 0;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            using var db = CreateConnection();
            var affected = await db.ExecuteAsync("DELETE FROM Todos WHERE Id = @Id", new { Id = id });
            return affected > 0;
        }
    }
}
