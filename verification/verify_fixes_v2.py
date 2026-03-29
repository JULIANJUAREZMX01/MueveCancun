import subprocess


def run_verification():
    """
    Thin wrapper that delegates to the canonical verification script.

    This script previously contained a duplicated verification flow.
    To avoid divergence, it now invokes `verification.verify_fixes`
    as the single source of truth.
    """
    print("Delegating verification to 'verification.verify_fixes'...")
    try:
        subprocess.run(
            ["python", "-m", "verification.verify_fixes"],
            check=True,
        )
        print("Delegated verification completed successfully.")
    except subprocess.CalledProcessError as e:
        print(f"Delegated verification failed with exit code {e.returncode}.")
        raise


if __name__ == '__main__':
    run_verification()
