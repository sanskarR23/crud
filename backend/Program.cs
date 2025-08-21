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
builder.Services.AddSingleton(new TodoRepository(conn));
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyHeader().AllowAnyMethod().AllowAnyOrigin();
    });
});

var app = builder.Build();
app.UseCors();

// ensure table exists
using (var connDb = new MySqlConnection(conn))
{
    await connDb.OpenAsync();
    var create = @"CREATE TABLE IF NOT EXISTS Todos (
        Id INT AUTO_INCREMENT PRIMARY KEY,
        Title VARCHAR(255) NOT NULL,
        Description TEXT,
        Completed TINYINT(1) DEFAULT 0
    );";
    await connDb.ExecuteAsync(create);
}

var repo = app.Services.GetRequiredService<TodoRepository>();

app.MapGet("/api/todos", async () => await repo.GetAllAsync());

app.MapGet("/api/todos/{id}", async (int id) =>
{
    var t = await repo.GetByIdAsync(id);
    return t is not null ? Results.Ok(t) : Results.NotFound();
});

app.MapPost("/api/todos", async (Todo todo) =>
{
    var id = await repo.CreateAsync(todo);
    todo.Id = id;
    return Results.Created($"/api/todos/{id}", todo);
});

app.MapPut("/api/todos/{id}", async (int id, Todo todo) =>
{
    if (id != todo.Id) return Results.BadRequest();
    var ok = await repo.UpdateAsync(todo);
    return ok ? Results.NoContent() : Results.NotFound();
});

app.MapDelete("/api/todos/{id}", async (int id) =>
{
    var ok = await repo.DeleteAsync(id);
    return ok ? Results.NoContent() : Results.NotFound();
});

app.Run();
