using Microsoft.AspNetCore.Mvc;
using Backend.Data;
using Backend.Models;
using System.Threading.Tasks;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class EmployeeController : ControllerBase
    {
        private readonly EmployeeRepository _repo;

        public EmployeeController(EmployeeRepository repo)
        {
            _repo = repo;
        }

        // POST api/employee/login
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest req)
        {
            var emp = await _repo.GetByIdAsync(req.EmpId);

            if (emp == null)
                return Unauthorized(new { message = "Employee not found" });

            if (emp.Password != req.Password)
                return Unauthorized(new { message = "Invalid password" });

            // ✅ Only admin allowed
            if (emp.EmpId != "admin")
                return Unauthorized(new { message = "Not an admin" });

            return Ok(new { message = "Login successful", employee = emp });
        }
    }

    public class LoginRequest
    {
        public string EmpId { get; set; }
        public string Password { get; set; }
    }
}
