#
############################
# Author:
# Daniel Kupčo
# 
# Introduction:
# A script for setting up the python virtual environment for viewX Visual Studio Code extension
# 
# Manual:
# Parameters needed for the script are -path (path for the environment to be created) and -name (name of the virtual environment).
# Optionaly you can define -reqFile (path to the requirements file).
# By default, it is assumed that script has been run from setup_scripts folder and the python_requirements.txt file from extension's root folder is been used.
#
# Note: Paths can be absolute or relative. ~ sign cannot be used, use C:\Users\<user> instead!
#
# Example:
# .\viewX_setup.ps1 -path "some\parent\folder" -name "env_name" [-reqFile "path\to\requirements\file"]
############################
#

param([switch]$help, [string]$path = "", [string]$name = "", [string]$reqFile = "")

function GetHelp {
    return "
    - Author: Daniel Kupčo
    
    - Introduction:
        A script for setting up the python virtual environment for viewX Visual Studio Code extension

    - Manual:
        Parameters needed for the script are -path (path for the environment to be created) and -name (name of the virtual environment).
        Optionaly you can define -reqFile (path to the requirements file).
        By default, it is assumed that script has been run from setup_scripts folder and the python_requirements.txt file from extension's root folder is been used.
    
    - Note:
        Paths can be absolute or relative. ~ sign cannot be used, use C:\Users\<user> instead!
    
    - Example:
        .\viewX_setup.ps1 -path ""some\parent\folder"" -name ""env_name"" [-reqFile ""path\to\requirements\file""]
    
    - Options:
        -help                |  Show brief help.
        -path PATH           |  Specify a path to the environment's root folder.
        -name NAME           |  Specify a name for the virtual environment.
        -reqFile PATH        |  Specify a path to the requirements file. By default the 'python_requirements.txt' file is been used from extension's root folder.
    "
}

# set -reqFile to use python_requirements.txt from the extension directory as default
if ($reqFile -eq "" -and $reqFile -eq [String]::Empty)
{
    $reqFile = ".\..\python_requirements.txt"
}

# print help
if ($help)
{
    [string]$result = GetHelp
    Write-Host $result
    exit
}

# if name argument is not defined
if ($name -eq "" -and $name -eq [String]::Empty)
{
    [string]$result = GetHelp
    Write-Error $result
    exit
}

# test if $path exists
if (Test-Path $path)
{
    [string]$venv = "$path\$name"
    if (Test-Path $venv)
    {
        Write-Error "
        - A directory with path '$venv' already exists!
        - Please remove the directory or choose another name...
        "
    }
    else
    {
        Write-Host "
            - Creating '$name' python virtual environment for viewX...
        "
        # set policy to unrestricted (admin access)
        Set-ExecutionPolicy Unrestricted -Scope CurrentUser
        # create python virtual environment
        virtualenv $venv

        Write-Host "
            - Adding 'viewXVEnv' environment variable..."

        # create the environment variable
        setx viewXVEnv $venv
        # copy requirements file to the virtual environment
        Copy-Item $reqFile $venv
        Write-Host "
            - Installing python requirements...
        "
        # this is the way to execute a script from specified path
        & "$venv\Scripts\pip" install -r "$venv\python_requirements.txt"
        Write-Host "
            - Creating the python symlink in the environment root folder...
        "
        # Developer mode must be enabled (enable permissions), then we execute CMD command and call mklink 
        cmd /c mklink "$venv\python.exe" "$venv\Scripts\python.exe"
        
        Write-Host "
            - Setup of viewX python virtual environment has been successfully finished!
            - You can now open the Visual Studio Code and start using the viewX extension! 
        "
    }
}
else
{
    Write-Error "
    - Path '$path' does not exist!
    "
}