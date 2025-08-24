using Microsoft.AspNetCore.Mvc;
using Backend.Data;
using Backend.Models;
using System.Threading.Tasks;
using System;
using System.IO;
using System.Text.RegularExpressions;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]  // → api/employee
    public class EmployeeController : ControllerBase
    {
        private readonly EmployeeRepository _repo;
        private readonly string _imageFolder = Path.Combine(Directory.GetCurrentDirectory(), "uploads");

        public EmployeeController(EmployeeRepository repo)
        {
            _repo = repo;

            // ensure upload folder exists
            if (!Directory.Exists(_imageFolder))
                Directory.CreateDirectory(_imageFolder);
        }

        // ✅ Login endpoint → POST api/employee/login
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest req)
        {
            var emp = await _repo.GetByIdAsync(req.EmpId);

            if (emp == null)
                return Unauthorized(new { message = "Employee not found" });

            if (emp.Password != req.Password)
                return Unauthorized(new { message = "Invalid password" });

            return Ok(new { message = "Login successful", employee = emp });
        }

        // ✅ Check endpoint → POST api/employee/check
        [HttpPost("check")]
        public async Task<IActionResult> Check([FromBody] CheckRequest req)
        {
            var emp = await _repo.GetByIdAsync(req.EmpId);

            if (emp == null || emp.Password != req.Password)
                return Ok(new { exists = false });

            bool hasImages = !string.IsNullOrWhiteSpace(emp.ImageCenter) &&
                             !string.IsNullOrWhiteSpace(emp.ImageLeft) &&
                             !string.IsNullOrWhiteSpace(emp.ImageRight);

            return Ok(new { exists = true, hasImages });
        }

        // ✅ Save Faces → POST api/employee/faces
        [HttpPost("faces")]
        public async Task<IActionResult> SaveFaces([FromBody] FacesRequest req)
        {
            var emp = await _repo.GetByIdAsync(req.EmpId);
            if (emp == null)
                return NotFound(new { message = "Employee not found" });

            if (req.Images == null || req.Images.Count != 3)
                return BadRequest(new { message = "Exactly 3 images required" });

            try
            {
                // save 3 images to uploads/ folder
                string centerPath = SaveBase64Image(req.Images[0], $"{req.EmpId}_center.jpg");
                string leftPath   = SaveBase64Image(req.Images[1], $"{req.EmpId}_left.jpg");
                string rightPath  = SaveBase64Image(req.Images[2], $"{req.EmpId}_right.jpg");

                // update DB
                emp.ImageCenter = Path.GetFileName(centerPath);
                emp.ImageLeft   = Path.GetFileName(leftPath);
                emp.ImageRight  = Path.GetFileName(rightPath);

                var updated = await _repo.UpdateAsync(emp);

                if (!updated)
                    return StatusCode(500, new { message = "Failed to update employee with images" });

                return Ok(new { message = "Images saved successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error saving images", error = ex.Message });
            }
        }

        // -------------------------
        // CRUD endpoints
        // -------------------------

        // GET api/employee
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var list = await _repo.GetAllAsync();
            return Ok(list);
        }

        // GET api/employee/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(string id)
        {
            var emp = await _repo.GetByIdAsync(id);
            if (emp == null)
                return NotFound(new { message = "Employee not found" });
            return Ok(emp);
        }

        // POST api/employee
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] Employee employee)
        {
            if (employee == null || string.IsNullOrWhiteSpace(employee.EmpId))
                return BadRequest(new { message = "Employee data or EmpId is missing" });

            var existing = await _repo.GetByIdAsync(employee.EmpId);
            if (existing != null)
                return Conflict(new { message = "Employee with given EmpId already exists" });

            var inserted = await _repo.CreateAsync(employee);
            if (inserted <= 0)
                return StatusCode(500, new { message = "Failed to create employee" });

            return CreatedAtAction(nameof(GetById), new { id = employee.EmpId }, employee);
        }

        // PUT api/employee/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(string id, [FromBody] Employee employee)
        {
            if (employee == null || id != employee.EmpId)
                return BadRequest(new { message = "Employee data missing or id mismatch" });

            var existing = await _repo.GetByIdAsync(id);
            if (existing == null)
                return NotFound(new { message = "Employee not found" });

            var ok = await _repo.UpdateAsync(employee);
            if (!ok)
                return StatusCode(500, new { message = "Failed to update employee" });

            return NoContent();
        }

        // DELETE api/employee/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(string id)
        {
            var existing = await _repo.GetByIdAsync(id);
            if (existing == null)
                return NotFound(new { message = "Employee not found" });

            var ok = await _repo.DeleteAsync(id);
            if (!ok)
                return StatusCode(500, new { message = "Failed to delete employee" });

            // Optionally remove images from disk
            TryDeleteImageFiles(existing.ImageCenter, existing.ImageLeft, existing.ImageRight);

            return NoContent();
        }

        // Helper: decode base64 string and save to disk
        private string SaveBase64Image(string base64, string fileName)
        {
            // strip prefix like "data:image/jpeg;base64,"
            var base64Data = Regex.Replace(base64, @"^data:image\/[a-zA-Z]+;base64,", "");
            byte[] bytes = Convert.FromBase64String(base64Data);

            string filePath = Path.Combine(_imageFolder, fileName);
            System.IO.File.WriteAllBytes(filePath, bytes);
            return filePath;
        }

        // Helper: delete image files if they exist
        private void TryDeleteImageFiles(string? center, string? left, string? right)
        {
            void TryDelete(string? file)
            {
                if (string.IsNullOrWhiteSpace(file)) return;
                var p = Path.Combine(_imageFolder, file);
                try { if (System.IO.File.Exists(p)) System.IO.File.Delete(p); } catch { }
            }

            TryDelete(center);
            TryDelete(left);
            TryDelete(right);
        }
    }

    // DTOs
    public class LoginRequest
    {
        public string EmpId { get; set; }
        public string Password { get; set; }
    }

    public class CheckRequest
    {
        public string EmpId { get; set; }
        public string Password { get; set; }
    }

    public class FacesRequest
    {
        public string EmpId { get; set; }
        public List<string> Images { get; set; }  // base64 strings
    }
}
