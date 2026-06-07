from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from superagent.planner.llm_router import LLMRouter
from superagent.planner.orchestrator import ApprovalRequired, Orchestrator
from superagent.tools.fs import resolve_in_workspace


class WorkspaceTests(unittest.TestCase):
    def test_rejects_path_traversal(self) -> None:
        with TemporaryDirectory() as directory:
            with self.assertRaises(ValueError):
                resolve_in_workspace(Path(directory), "../secret.txt")

    def test_read_and_approved_write(self) -> None:
        with TemporaryDirectory() as directory:
            agent = Orchestrator(Path(directory))
            with self.assertRaises(ApprovalRequired):
                agent.execute("fs.write_text", {"path": "note.txt", "content": "hello"})
            write_result = agent.execute("fs.write_text", {"path": "note.txt", "content": "hello"}, approved_risk=2)
            self.assertTrue(write_result["created"])
            read_result = agent.execute("fs.read_text", {"path": "note.txt"})
            self.assertEqual(read_result["content"], "hello")

    def test_descriptors_are_mcp_shaped(self) -> None:
        with TemporaryDirectory() as directory:
            descriptor = Orchestrator(Path(directory)).descriptors()[0]
            self.assertIn("inputSchema", descriptor)
            self.assertIn("riskLevel", descriptor["annotations"])

    def test_shell_requires_level_three_approval(self) -> None:
        with TemporaryDirectory() as directory:
            agent = Orchestrator(Path(directory))
            with self.assertRaises(ApprovalRequired):
                agent.execute("shell.run", {"argv": ["git", "status"]}, approved_risk=2)


class RouterTests(unittest.TestCase):
    def test_sensitive_work_stays_local(self) -> None:
        route = LLMRouter(remote_model="remote/model").select("analyze", contains_sensitive_data=True)
        self.assertEqual(route.provider, "local")

    def test_complex_work_can_use_remote_model(self) -> None:
        route = LLMRouter(remote_model="remote/model").select("Planifica una arquitectura")
        self.assertEqual(route.provider, "remote")


if __name__ == "__main__":
    unittest.main()
