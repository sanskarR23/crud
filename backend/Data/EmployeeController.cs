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
