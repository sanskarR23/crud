using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using MySqlConnector;
using Dapper;

var builder = WebApplication.CreateBuilder(args);

// get connection string from appsettings.json
var configuration = builder.Configuration;
var conn = configuration.GetConnectionString("Default") ?? "";

// register EmployeeRepository as a service
builder.Services.AddSingleton(new EmployeeRepository(conn));

// add controllers
builder.Services.AddControllers();

// allow CORS
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyHeader().AllowAnyMethod().AllowAnyOrigin();
    });
});

var app = builder.Build();
app.UseCors();

// auto-create Employees table if not exists
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

// map controllers (EmployeeController etc.)
app.MapControllers();

// default root endpoint to avoid 404 when requesting '/'
app.MapGet("/", () => Results.Ok(new { message = "API running" }));

app.Run();
