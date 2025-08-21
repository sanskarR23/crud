using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using MySqlConnector;
using Dapper;
using System.Threading.Tasks;

var builder = WebApplication.CreateBuilder(args);

// configuration
var configuration = builder.Configuration;
var conn = configuration.GetConnectionString("Default") ?? "";

// register repo
builder.Services.AddSingleton(new EmployeeRepository(conn));
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyHeader().AllowAnyMethod().AllowAnyOrigin();
    });
});

var app = builder.Build();
app.UseCors();

// ensure Employees table exists
using (var connDb = new MySqlConnection(conn))
{
    await connDb.OpenAsync();
    var create = @"CREATE TABLE IF NOT EXISTS Employees (
        emp_id VARCHAR(50) PRIMARY KEY,
        empname VARCHAR(100) NOT NULL,
        emp_desk_id VARCHAR(50) NOT NULL,
        password VARCHAR(255) NOT NULL,
        image_center VARCHAR(255),
        image_left VARCHAR(255),
        image_right VARCHAR(255)
    );";
    await connDb.ExecuteAsync(create);
}

var repo = app.Services.GetRequiredService<EmployeeRepository>();

// ✅ Login API
app.MapPost("/api/employee/login", async (LoginRequest req) =>
{
    Console.WriteLine($"[DEBUG] Login attempt for EmpId = {req.EmpId}, Password = {req.Password}");

    var emp = await repo.GetByIdAsync(req.EmpId);

    if (emp == null)
    {
        // Console.WriteLine("[DEBUG] Employee not found in database.");
        return Results.Unauthorized();
    }
    // Console.WriteLine($"[DEBUG] Employee found: EmpId = {emp.EmpId}, Name = {empname}, Password = {emp.Password}");

    if (emp.Password != req.Password)
    {
        // Console.WriteLine($"[DEBUG] Password mismatch. Expected = {emp.Password}, Provided = {req.Password}");
        return Results.Unauthorized();
    }
    // Console.WriteLine("[DEBUG] Password matched successfully.");

    return Results.Ok(new { message = "Login successful", employee = emp });
});


// ✅ CRUD APIs (optional if you need them)
app.MapGet("/api/employees", async () => await repo.GetAllAsync());

app.MapGet("/api/employees/{id}", async (string id) =>
{
    var emp = await repo.GetByIdAsync(id);
    return emp is not null ? Results.Ok(emp) : Results.NotFound();
});

app.MapPost("/api/employees", async (Employee employee) =>
{
    var ok = await repo.CreateAsync(employee);
    return ok > 0 ? Results.Created($"/api/employees/{employee.EmpId}", employee) : Results.BadRequest();
});

app.MapPut("/api/employees/{id}", async (string id, Employee employee) =>
{
    if (id != employee.EmpId) return Results.BadRequest();
    var ok = await repo.UpdateAsync(employee);
    return ok ? Results.NoContent() : Results.NotFound();
});

app.MapDelete("/api/employees/{id}", async (string id) =>
{
    var ok = await repo.DeleteAsync(id);
    return ok ? Results.NoContent() : Results.NotFound();
});

app.Run();

// DTO for login
public record LoginRequest(string EmpId, string Password);
