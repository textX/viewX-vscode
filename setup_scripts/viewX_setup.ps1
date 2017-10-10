param([string]$path = "", [string]$name = "", [string]$reqFile = "")

if ($reqFile -eq "" -and $reqFile -eq [String]::Empty)
{
    $reqFile = ".\..\python_requirements.txt"
}

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
        # create the environment variable
        setx viewXVEnv $venv
        # copy requirements file to the virtual environment
        Copy-Item $reqFile $venv
        # this is the way to execute a script from specified path
        & "$venv\Scripts\pip" install -r "$venv\python_requirements.txt"
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