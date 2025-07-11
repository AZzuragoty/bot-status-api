from discord.ext import commands
import discord
from discord import app_commands
import json

def load_config():
    with open("config.json", "r") as f:
        return json.load(f)

def save_config(config):
    with open("config.json", "w") as f:
        json.dump(config, f, indent=4)

class Admin(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    def get_whitelist(self):
        config = load_config()
        return config.get("whitelist", [])

    @app_commands.command(name="whitelist_add", description="Ajouter un membre à la whitelist du serveur")
    @app_commands.describe(member="Le membre à ajouter à la whitelist")
    async def whitelist_add(self, interaction: discord.Interaction, member: discord.Member):
        config = load_config()
        guild_id = str(interaction.guild.id)

        if "whitelist" not in config:
            config["whitelist"] = {}
        if guild_id not in config["whitelist"]:
            config["whitelist"][guild_id] = []

        if member.id not in config["whitelist"][guild_id]:
            config["whitelist"][guild_id].append(member.id)
            save_config(config)
            await interaction.response.send_message(f"{member.mention} ajouté à la whitelist de ce serveur ✅", ephemeral=True)
        else:
            await interaction.response.send_message("Ce membre est déjà dans la whitelist de ce serveur.", ephemeral=True)


    @app_commands.command(name="whitelist_remove", description="Retirer un membre de la whitelist du serveur")
    @app_commands.describe(member="Le membre à retirer de la whitelist")
    async def whitelist_remove(self, interaction: discord.Interaction, member: discord.Member):
        config = load_config()
        guild_id = str(interaction.guild.id)

        if "whitelist" in config and guild_id in config["whitelist"]:
            if member.id in config["whitelist"][guild_id]:
                config["whitelist"][guild_id].remove(member.id)
                save_config(config)
                await interaction.response.send_message(f"{member.mention} retiré de la whitelist de ce serveur ✅", ephemeral=True)
                return

        await interaction.response.send_message("Ce membre n'est pas dans la whitelist de ce serveur.", ephemeral=True)

    @app_commands.command(name="showwhitelist", description="Afficher la whitelist du serveur actuel")
    async def show_whitelist(self, interaction: discord.Interaction):
        config = load_config()
        guild_id = str(interaction.guild.id)

        guild_whitelist = config.get("whitelist", {}).get(guild_id, [])
        if guild_whitelist:
            list_str = "\n".join([f"- <@{uid}> (`{uid}`)" for uid in guild_whitelist])
            await interaction.response.send_message(f"**Whitelist pour ce serveur :**\n{list_str}", ephemeral=True)
        else:
            await interaction.response.send_message("La whitelist de ce serveur est vide.", ephemeral=True)


    @app_commands.command(name="lockdown", description="Désactiver toutes les permissions des rôles du serveur")
    async def lockdown(self, interaction: discord.Interaction):
        for role in interaction.guild.roles:
            try:
                await role.edit(permissions=discord.Permissions.none())
            except Exception as e:
                print(f"Erreur lors de l'édition du rôle {role.name}: {e}")
        await interaction.response.send_message("🔒 Lockdown activé. Toutes les permissions ont été révoquées.", ephemeral=True)

    @app_commands.command(name="help", description="Voir la liste des commandes disponibles")
    async def help_command(self, interaction: discord.Interaction):
        embed = discord.Embed(
            title="📖 Liste des commandes",
            color=discord.Color.blurple()
        )
        embed.add_field(name="/whitelist_add", value="Ajouter un membre à la whitelist.", inline=False)
        embed.add_field(name="/whitelist_remove", value="Retirer un membre de la whitelist.", inline=False)
        embed.add_field(name="/showwhitelist", value="Voir tous les utilisateurs whitelistés.", inline=False)
        embed.add_field(name="/lockdown", value="Lockdown manuel : enlève toutes les permissions.", inline=False)
        embed.add_field(name="/help", value="Afficher ce message d'aide.", inline=False)
        await interaction.response.send_message(embed=embed, ephemeral=True)

async def setup(bot):
    cog = Admin(bot)
    await bot.add_cog(cog)
