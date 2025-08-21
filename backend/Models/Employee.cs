using System;

namespace Backend.Models
{
    public class Employee
    {
        public string EmpId { get; set; } = string.Empty;   // remove static "emp_01"
        public string EmpName { get; set; } = string.Empty;
        public string EmpDeskId { get; set; } = string.Empty; // remove static "desk_01"
        public string Password { get; set; } = string.Empty;

        // Store image paths or Base64 strings
        public string? ImageCenter { get; set; }
        public string? ImageLeft { get; set; }
        public string? ImageRight { get; set; }
    }
}
