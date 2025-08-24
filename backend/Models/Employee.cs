using System;

namespace Backend.Models
{
    public class Employee
    {
    public string EmpId { get; set; } = string.Empty; // emp_id is treated as a string across the app (DTOs and repository)
        public string EmpName { get; set; } = string.Empty;
        public string EmpDeskId { get; set; } = string.Empty; // remove static "desk_01"
    public string Password { get; set; } = string.Empty; // Password is stored/compared as string in controllers/repo

        // Store image paths or Base64 strings
    public string? ImageCenter { get; set; } // Image file names stored in DB (nullable when not set)
    public string? ImageLeft { get; set; }
    public string? ImageRight { get; set; }
    }
}
